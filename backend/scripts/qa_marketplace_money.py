"""Smoke-test category commission + payout hold clearance."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

from django.utils import timezone

from accounts.models import User, UserRole
from shop.models import (
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductApprovalStatus,
    ProductCategory,
    ProductSourceType,
    ProductStatus,
    ProductVariant,
    VendorLedgerEntry,
)
from shop.services.commission import (
    calculate_line_fees,
    get_default_commission_plan,
    record_vendor_ledger,
    resolve_commission_rate,
)
from shop.services.payouts import (
    PAYOUT_HOLD_DAYS,
    _order_cleared_for_payout,
    vendor_balance_breakdown,
)


def run() -> None:
    from api.views.finance import public_seller_fees
    from rest_framework.test import APIRequestFactory

    factory = APIRequestFactory()
    fees_res = public_seller_fees(factory.get("/api/v1/shop/seller-fees"))
    assert fees_res.status_code == 200, fees_res.status_code
    body = fees_res.data
    assert body["hold_days"] == PAYOUT_HOLD_DAYS
    assert len(body["plans"]) >= 1
    print(f"OK public seller-fees: {len(body['plans'])} plans, {len(body['category_rates'])} categories")

    cat = ProductCategory.objects.filter(commission_percent__isnull=False).first()
    assert cat, "No category rates seeded"
    print(f"OK category {cat.slug} @ {cat.commission_percent}%")

    vendor = User.objects.filter(role=UserRole.VENDOR).first()
    buyer = User.objects.filter(role=UserRole.OWNER).first() or User.objects.exclude(
        id=getattr(vendor, "id", None)
    ).first()
    assert vendor and buyer, "Need vendor + buyer users in DB"

    slug = f"qa-money-{uuid4().hex[:10]}"
    product = Product.objects.create(
        vendor=vendor,
        category=cat,
        slug=slug,
        title="QA Money Product",
        source_type=ProductSourceType.VENDOR,
        approval_status=ProductApprovalStatus.APPROVED,
        status=ProductStatus.PUBLISHED,
    )
    variant = ProductVariant.objects.create(
        product=product,
        sku=f"QA-{uuid4().hex[:8].upper()}",
        price=Decimal("1000.00"),
        stock_qty=10,
    )

    plan = get_default_commission_plan()
    rate = resolve_commission_rate(product, plan, vendor.id)
    assert rate == Decimal(cat.commission_percent), (rate, cat.commission_percent)
    fees = calculate_line_fees(
        unit_price=Decimal("1000"), qty=1, product=product, vendor_id=vendor.id
    )
    assert fees["commission_rate"] == Decimal(cat.commission_percent)
    print(f"OK category commission applied: {fees['commission_rate']}% fee={fees['platform_fee']}")

    order = Order.objects.create(
        user=buyer,
        status=OrderStatus.PROCESSING,
        subtotal=Decimal("1000"),
        total=Decimal("1000"),
        currency="BDT",
    )
    item = OrderItem.objects.create(
        order=order,
        variant=variant,
        vendor=vendor,
        source_type=ProductSourceType.VENDOR,
        title_snapshot=product.title[:255],
        price_snapshot=Decimal("1000"),
        qty=1,
        line_subtotal=fees["line_subtotal"],
        commission_rate=fees["commission_rate"],
        platform_fee=fees["platform_fee"],
        payment_processing_fee=fees["payment_processing_fee"],
        vendor_earnings=fees["vendor_earnings"],
        platform_revenue=fees["platform_revenue"],
    )
    record_vendor_ledger(item)

    before = vendor_balance_breakdown(vendor.id)
    assert before["held_for_clearance"] > 0, before
    print(
        f"OK hold while not delivered: held={before['held_for_clearance']} "
        f"available={before['available_for_payout']}"
    )
    assert not _order_cleared_for_payout(order)

    order.status = OrderStatus.DELIVERED
    order.save(update_fields=["status", "updated_at"])
    Order.objects.filter(pk=order.pk).update(updated_at=timezone.now())
    order.refresh_from_db()
    assert not _order_cleared_for_payout(order), "Should still be in hold window"
    mid = vendor_balance_breakdown(vendor.id)
    print(f"OK delivered but in {PAYOUT_HOLD_DAYS}d hold: held={mid['held_for_clearance']}")

    past = timezone.now() - timedelta(days=PAYOUT_HOLD_DAYS + 1)
    Order.objects.filter(pk=order.pk).update(updated_at=past)
    order.refresh_from_db()
    assert _order_cleared_for_payout(order), "Should clear after hold"
    after = vendor_balance_breakdown(vendor.id)
    print(
        f"OK cleared after hold: held={after['held_for_clearance']} "
        f"available={after['available_for_payout']}"
    )

    VendorLedgerEntry.objects.filter(order_item_id=item.id).delete()
    item.delete()
    order.delete()
    variant.delete()
    product.delete()
    print("QA PASS")


if __name__ == "__main__":
    run()
