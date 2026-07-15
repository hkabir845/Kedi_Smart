"""Inventory helpers — Shopify/Square-style stock tracking with soft cart reservations."""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from shop.models import (
    CartItem,
    InventoryMovement,
    InventoryMovementReason,
    ProductKind,
    ProductVariant,
)


class InsufficientStockError(Exception):
    def __init__(self, title: str, available: int, requested: int):
        self.title = title
        self.available = available
        self.requested = requested
        super().__init__(
            f"Insufficient stock for {title}: {available} available, {requested} requested"
        )


def tracks_inventory(variant: ProductVariant) -> bool:
    product = variant.product
    if product.product_kind in (ProductKind.SERVICE, ProductKind.DIGITAL):
        return False
    return bool(product.track_inventory)


def reserve_ttl_minutes() -> int:
    return int(getattr(settings, "CART_RESERVE_MINUTES", 30) or 30)


def available_qty(variant: ProductVariant, *, own_reserved: int = 0) -> int:
    if not tracks_inventory(variant):
        return 10**9
    return max(0, int(variant.stock_qty) - int(variant.reserved_qty or 0) + int(own_reserved))


@transaction.atomic
def expire_reservations(*, cart_id: int | None = None) -> int:
    """Release reserved stock for expired cart lines. Returns number of lines released."""
    now = timezone.now()
    qs = CartItem.objects.select_related("variant", "variant__product").filter(
        reserved_until__isnull=False, reserved_until__lt=now
    )
    if cart_id:
        qs = qs.filter(cart_id=cart_id)
    released = 0
    for item in qs:
        if item.variant_id and tracks_inventory(item.variant):
            _adjust_reserved(item.variant_id, -item.qty)
            released += 1
        item.reserved_until = None
        item.save(update_fields=["reserved_until"])
    return released


def _adjust_reserved(variant_id: int, delta: int) -> None:
    locked = ProductVariant.objects.select_for_update().get(pk=variant_id)
    new_reserved = max(0, int(locked.reserved_qty or 0) + int(delta))
    locked.reserved_qty = new_reserved
    locked.save(update_fields=["reserved_qty", "updated_at"])


@transaction.atomic
def reserve_cart_qty(variant: ProductVariant, *, new_qty: int, previous_qty: int = 0) -> None:
    """Hold stock for a cart line. Raises InsufficientStockError if not enough available."""
    if new_qty < 0:
        new_qty = 0
    locked = ProductVariant.objects.select_for_update().select_related("product").get(pk=variant.pk)
    if not tracks_inventory(locked):
        return
    delta = int(new_qty) - int(previous_qty)
    if delta == 0:
        return
    if delta > 0:
        avail = available_qty(locked)
        if delta > avail:
            raise InsufficientStockError(locked.product.title, avail, delta)
    _adjust_reserved(locked.id, delta)


@transaction.atomic
def release_cart_reservation(variant: ProductVariant, qty: int) -> None:
    if qty <= 0:
        return
    locked = ProductVariant.objects.select_for_update().select_related("product").get(pk=variant.pk)
    if not tracks_inventory(locked):
        return
    _adjust_reserved(locked.id, -int(qty))


def touch_cart_reservations(cart) -> None:
    """Extend / ensure reservation TTL for all items in a cart."""
    expire_reservations(cart_id=cart.id)
    until = timezone.now() + timedelta(minutes=reserve_ttl_minutes())
    items = CartItem.objects.filter(cart_id=cart.id).select_related("variant", "variant__product")
    for item in items:
        if not item.variant_id or not tracks_inventory(item.variant):
            continue
        if not item.reserved_until:
            try:
                reserve_cart_qty(item.variant, new_qty=item.qty, previous_qty=0)
            except InsufficientStockError:
                continue
        item.reserved_until = until
        item.save(update_fields=["reserved_until"])


@transaction.atomic
def adjust_stock(
    variant: ProductVariant,
    *,
    delta: int,
    reason: str,
    actor=None,
    note: str = "",
    order=None,
    order_item=None,
    allow_negative: bool = False,
) -> ProductVariant:
    """Apply a signed delta and write an InventoryMovement row."""
    locked = ProductVariant.objects.select_for_update().select_related("product").get(pk=variant.pk)
    if not tracks_inventory(locked):
        return locked

    new_qty = locked.stock_qty + int(delta)
    if not allow_negative and new_qty < 0:
        raise InsufficientStockError(
            locked.product.title,
            locked.stock_qty,
            abs(int(delta)) if delta < 0 else int(delta),
        )

    locked.stock_qty = new_qty
    locked.save(update_fields=["stock_qty", "updated_at"])
    InventoryMovement.objects.create(
        variant=locked,
        delta=int(delta),
        quantity_after=new_qty,
        reason=reason,
        note=(note or "")[:255],
        actor=actor,
        order=order,
        order_item=order_item,
    )
    return locked


@transaction.atomic
def set_stock(
    variant: ProductVariant,
    *,
    quantity: int,
    actor=None,
    note: str = "",
    reason: str = InventoryMovementReason.ADJUSTMENT,
) -> ProductVariant:
    quantity = max(0, int(quantity))
    locked = ProductVariant.objects.select_for_update().select_related("product").get(pk=variant.pk)
    if not tracks_inventory(locked):
        locked.stock_qty = quantity
        locked.save(update_fields=["stock_qty", "updated_at"])
        return locked
    delta = quantity - locked.stock_qty
    if delta == 0:
        return locked
    return adjust_stock(
        locked,
        delta=delta,
        reason=reason,
        actor=actor,
        note=note or f"Set stock to {quantity}",
        allow_negative=False,
    )


@transaction.atomic
def consume_stock_for_sale(
    variant: ProductVariant,
    qty: int,
    *,
    order=None,
    order_item=None,
    actor=None,
    reason: str = InventoryMovementReason.SALE,
    release_reserved: int = 0,
) -> ProductVariant | None:
    """Decrement on-hand stock for a sale and release matching cart reservation."""
    if qty <= 0:
        return None
    locked = ProductVariant.objects.select_for_update().select_related("product").get(pk=variant.pk)
    if not tracks_inventory(locked):
        return locked
    # Own cart reservation counts toward availability
    avail = available_qty(locked, own_reserved=int(release_reserved or 0))
    if avail < qty:
        raise InsufficientStockError(locked.product.title, avail, qty)
    if release_reserved:
        locked.reserved_qty = max(0, int(locked.reserved_qty or 0) - int(release_reserved))
        locked.save(update_fields=["reserved_qty", "updated_at"])
    return adjust_stock(
        locked,
        delta=-qty,
        reason=reason,
        actor=actor,
        note="Checkout sale" if reason == InventoryMovementReason.SALE else "Manual sale",
        order=order,
        order_item=order_item,
    )


@transaction.atomic
def restore_stock_for_order(order, *, actor=None, note: str = "Order cancelled / refunded") -> int:
    """Restock all order lines that consumed inventory."""
    restored = 0
    from shop.models import OrderItem

    for item in OrderItem.objects.filter(order_id=order.id).select_related("variant", "variant__product"):
        if not item.variant_id:
            continue
        already = InventoryMovement.objects.filter(
            order_item_id=item.id, reason=InventoryMovementReason.RETURN
        ).exists()
        if already:
            continue
        if not tracks_inventory(item.variant):
            continue
        adjust_stock(
            item.variant,
            delta=item.qty,
            reason=InventoryMovementReason.RETURN,
            actor=actor,
            note=note,
            order=order,
            order_item=item,
        )
        restored += 1
    return restored


def assert_cart_stock(cart_items) -> None:
    """Pre-flight stock check before creating an order (considers cart's own hold)."""
    for item in cart_items:
        if not item.variant_id:
            continue
        variant = ProductVariant.objects.select_related("product").filter(id=item.variant_id).first()
        if not variant or not tracks_inventory(variant):
            continue
        own = item.qty if item.reserved_until and item.reserved_until > timezone.now() else 0
        avail = available_qty(variant, own_reserved=own)
        if avail < item.qty:
            raise InsufficientStockError(variant.product.title, avail, item.qty)
