"""Per-vendor shipment creation, status updates, and order status rollup."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from shop.models import (
    CourierProvider,
    FulfillmentType,
    Order,
    OrderItem,
    OrderStatus,
    Shipment,
    ShipmentStatus,
)


def _vendor_keys_for_order(order: Order) -> list[int | None]:
    keys: list[int | None] = []
    seen: set[int | None] = set()
    for item in OrderItem.objects.filter(order_id=order.id).only("vendor_id"):
        key = item.vendor_id
        if key not in seen:
            seen.add(key)
            keys.append(key)
    if not keys:
        keys = [None]
    return keys


@transaction.atomic
def ensure_shipments_for_order(order: Order) -> list[Shipment]:
    """Create one shipment row per vendor (or platform) if missing."""
    created: list[Shipment] = []
    for vendor_id in _vendor_keys_for_order(order):
        qs = Shipment.objects.filter(order_id=order.id, vendor_id=vendor_id)
        shipment = qs.first()
        if shipment:
            created.append(shipment)
            continue
        initial = ShipmentStatus.PENDING
        if order.status in (OrderStatus.PAID, OrderStatus.PROCESSING):
            initial = ShipmentStatus.PROCESSING
        elif order.status == OrderStatus.READY_FOR_PICKUP:
            initial = ShipmentStatus.READY
        elif order.status == OrderStatus.SHIPPED:
            initial = ShipmentStatus.SHIPPED
        elif order.status == OrderStatus.DELIVERED:
            initial = ShipmentStatus.DELIVERED
        shipment = Shipment.objects.create(
            order=order,
            vendor_id=vendor_id,
            status=initial,
            courier=CourierProvider.MANUAL,
        )
        created.append(shipment)
    return created


def serialize_shipment(shipment: Shipment) -> dict:
    return {
        "id": shipment.id,
        "order_id": shipment.order_id,
        "vendor_id": shipment.vendor_id,
        "status": shipment.status,
        "courier": shipment.courier,
        "consignment_id": shipment.consignment_id,
        "tracking_number": shipment.tracking_number,
        "tracking_url": shipment.tracking_url,
        "carrier_note": shipment.carrier_note,
        "shipped_at": shipment.shipped_at.isoformat() if shipment.shipped_at else None,
        "delivered_at": shipment.delivered_at.isoformat() if shipment.delivered_at else None,
        "updated_at": shipment.updated_at.isoformat() if shipment.updated_at else None,
    }


def rollup_order_status(order: Order) -> Order:
    """Derive order.status from per-vendor shipments (Amazon multi-seller style)."""
    shipments = list(Shipment.objects.filter(order_id=order.id))
    if not shipments:
        return order
    if order.status in (OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.PENDING):
        return order

    statuses = {s.status for s in shipments}
    if statuses <= {ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED}:
        return order
    active = statuses - {ShipmentStatus.CANCELLED, ShipmentStatus.RETURNED}
    if not active:
        return order

    if order.fulfillment_type == FulfillmentType.STORE_PICKUP:
        if active <= {ShipmentStatus.DELIVERED, ShipmentStatus.READY}:
            if ShipmentStatus.READY in active and ShipmentStatus.DELIVERED not in active:
                new_status = OrderStatus.READY_FOR_PICKUP
            else:
                new_status = OrderStatus.DELIVERED if active == {ShipmentStatus.DELIVERED} else OrderStatus.READY_FOR_PICKUP
        elif ShipmentStatus.PROCESSING in active or ShipmentStatus.PENDING in active:
            new_status = OrderStatus.PROCESSING
        else:
            new_status = order.status
    else:
        if active == {ShipmentStatus.DELIVERED}:
            new_status = OrderStatus.DELIVERED
        elif ShipmentStatus.SHIPPED in active or ShipmentStatus.DELIVERED in active:
            new_status = OrderStatus.SHIPPED
        elif ShipmentStatus.PROCESSING in active or ShipmentStatus.READY in active:
            new_status = OrderStatus.PROCESSING
        else:
            new_status = OrderStatus.PAID if order.status == OrderStatus.PENDING else order.status

    if new_status != order.status and order.status not in (OrderStatus.CANCELLED, OrderStatus.REFUNDED):
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])
        try:
            from shop.services.notify import notify_order_status

            notify_order_status(order, new_status)
        except Exception:
            pass
    return order


@transaction.atomic
def update_shipment(
    shipment: Shipment,
    *,
    status: str | None = None,
    courier: str | None = None,
    tracking_number: str | None = None,
    tracking_url: str | None = None,
    consignment_id: str | None = None,
    carrier_note: str | None = None,
) -> Shipment:
    if status:
        if status not in {c.value for c in ShipmentStatus}:
            raise ValueError("Invalid shipment status")
        shipment.status = status
        if status == ShipmentStatus.SHIPPED and not shipment.shipped_at:
            shipment.shipped_at = timezone.now()
        if status == ShipmentStatus.DELIVERED and not shipment.delivered_at:
            shipment.delivered_at = timezone.now()
            if not shipment.shipped_at:
                shipment.shipped_at = shipment.delivered_at
    if courier is not None:
        if courier and courier not in {c.value for c in CourierProvider}:
            raise ValueError("Invalid courier")
        shipment.courier = courier or CourierProvider.MANUAL
    if tracking_number is not None:
        shipment.tracking_number = (tracking_number or "").strip() or None
    if tracking_url is not None:
        shipment.tracking_url = (tracking_url or "").strip() or None
    if consignment_id is not None:
        shipment.consignment_id = (consignment_id or "").strip() or None
    if carrier_note is not None:
        shipment.carrier_note = (carrier_note or "").strip() or None
    shipment.save()
    rollup_order_status(shipment.order)
    return shipment


@transaction.atomic
def book_courier(shipment: Shipment, *, provider: str = CourierProvider.MANUAL) -> Shipment:
    """Create a consignment via courier adapter (manual stores tracking locally)."""
    from shop.services.couriers import get_courier

    adapter = get_courier(provider)
    result = adapter.create_consignment(shipment)
    shipment.courier = provider
    shipment.consignment_id = result.get("consignment_id") or shipment.consignment_id
    shipment.tracking_number = result.get("tracking_number") or shipment.tracking_number
    shipment.tracking_url = result.get("tracking_url") or shipment.tracking_url
    shipment.carrier_note = result.get("note") or shipment.carrier_note
    if shipment.status in (ShipmentStatus.PENDING, ShipmentStatus.PROCESSING, ShipmentStatus.READY):
        shipment.status = ShipmentStatus.SHIPPED
        shipment.shipped_at = shipment.shipped_at or timezone.now()
    shipment.save()
    rollup_order_status(shipment.order)
    return shipment
