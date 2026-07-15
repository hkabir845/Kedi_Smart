"""Coupon validation and discount calculation."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from shop.models import Coupon, CouponType


class CouponError(Exception):
    pass


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_coupon(code: str | None) -> Coupon | None:
    if not code:
        return None
    return Coupon.objects.filter(code__iexact=str(code).strip()).first()


def validate_coupon(code: str | None, *, subtotal: Decimal) -> tuple[Coupon | None, Decimal]:
    """Return (coupon, discount_amount). Raises CouponError if invalid code provided."""
    raw = (code or "").strip()
    if not raw:
        return None, Decimal("0.00")

    coupon = get_coupon(raw)
    if not coupon or not coupon.active:
        raise CouponError("Invalid or inactive coupon code")

    today = timezone.localdate()
    if coupon.start_date and today < coupon.start_date:
        raise CouponError("This coupon is not active yet")
    if coupon.end_date and today > coupon.end_date:
        raise CouponError("This coupon has expired")
    if coupon.usage_limit is not None and coupon.times_used >= coupon.usage_limit:
        raise CouponError("This coupon has reached its usage limit")

    if coupon.type == CouponType.PERCENTAGE:
        discount = _money(subtotal * coupon.value / Decimal("100"))
    else:
        discount = _money(min(coupon.value, subtotal))

    if discount <= 0:
        raise CouponError("Coupon does not apply to this order")
    return coupon, discount


def record_coupon_use(coupon: Coupon | None) -> None:
    if not coupon:
        return
    coupon.times_used = int(coupon.times_used or 0) + 1
    coupon.save(update_fields=["times_used", "updated_at"])
