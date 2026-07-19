"""Marketplace commission and revenue split calculations.

Applies to all marketplace sellers (shop vendors, vets, breeders/traders/shelters)
the same way Amazon/Etsy take a fee from the seller side of each sale.
"""

from decimal import Decimal, ROUND_HALF_UP

from accounts.services.sellers import get_seller_finance_profile
from shop.models import (
    CommissionAppliesTo,
    CommissionPlan,
    LedgerEntryType,
    Product,
    ProductApprovalStatus,
    ProductSourceType,
    VendorLedgerEntry,
)


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_default_commission_plan() -> CommissionPlan | None:
    return CommissionPlan.objects.filter(is_default=True, is_active=True).first()


def get_commission_plan_for_vendor(vendor_id: int | None) -> CommissionPlan | None:
    """Resolve commission plan for any marketplace seller (vendor FK = seller user id)."""
    return get_commission_plan_for_seller(vendor_id)


def get_commission_plan_for_seller(seller_id: int | None) -> CommissionPlan | None:
    if not seller_id:
        return None
    profile = get_seller_finance_profile(seller_id)
    if profile and getattr(profile, "commission_plan_id", None) and profile.commission_plan.is_active:
        return profile.commission_plan
    return get_default_commission_plan()


def _category_commission_rate(product: Product | None) -> Decimal | None:
    """Daraz-style: category take rate when configured."""
    if not product or not product.category_id:
        return None
    category = product.category
    if category is None:
        return None
    # Walk up parents for a configured rate
    seen = set()
    current = category
    while current and current.id not in seen:
        seen.add(current.id)
        if current.commission_percent is not None:
            return Decimal(current.commission_percent)
        current = current.parent
    return None


def resolve_commission_rate(product: Product, plan: CommissionPlan | None, vendor_id: int | None) -> Decimal:
    if product.is_platform_sold or not vendor_id:
        return Decimal("0")

    profile = get_seller_finance_profile(vendor_id)
    if profile and profile.commission_rate_override is not None:
        return profile.commission_rate_override

    category_rate = _category_commission_rate(product)
    if category_rate is not None:
        return category_rate

    if plan:
        return plan.commission_percent

    return Decimal("10.00")


def resolve_manual_commission_rate(vendor_id: int | None, plan: CommissionPlan | None) -> Decimal:
    """Services / walk-in invoices — prefer services plan, else seller plan."""
    profile = get_seller_finance_profile(vendor_id) if vendor_id else None
    if profile and profile.commission_rate_override is not None:
        return profile.commission_rate_override
    if plan and plan.slug == "services":
        return plan.commission_percent
    services = CommissionPlan.objects.filter(slug="services", is_active=True).first()
    if services:
        return services.commission_percent
    if plan:
        return plan.commission_percent
    return Decimal("10.00")


def calculate_manual_vendor_fees(
    *,
    unit_price: Decimal,
    qty: int,
    vendor_id: int | None,
) -> dict:
    """Commission split for seller-issued invoices (no Product row)."""
    line_subtotal = _money(unit_price * qty)
    if not vendor_id:
        return {
            "line_subtotal": line_subtotal,
            "commission_rate": Decimal("0"),
            "platform_fee": Decimal("0"),
            "payment_processing_fee": Decimal("0"),
            "vendor_earnings": Decimal("0"),
            "platform_revenue": line_subtotal,
        }

    plan = get_commission_plan_for_seller(vendor_id)
    commission_rate = resolve_manual_commission_rate(vendor_id, plan)

    platform_fee = _money(line_subtotal * commission_rate / Decimal("100"))
    processing_pct = plan.payment_processing_percent if plan else Decimal("2.9")
    processing_fixed = plan.payment_processing_fixed if plan else Decimal("0.30")
    processing_fee = _money(line_subtotal * processing_pct / Decimal("100") + processing_fixed)
    vendor_earnings = _money(line_subtotal - platform_fee - processing_fee)
    return {
        "line_subtotal": line_subtotal,
        "commission_rate": commission_rate,
        "platform_fee": platform_fee,
        "payment_processing_fee": processing_fee,
        "vendor_earnings": max(vendor_earnings, Decimal("0")),
        "platform_revenue": platform_fee,
    }


def calculate_line_fees(
    *,
    unit_price: Decimal,
    qty: int,
    product: Product,
    vendor_id: int | None,
) -> dict:
    line_subtotal = _money(unit_price * qty)
    plan = get_commission_plan_for_seller(vendor_id)
    commission_rate = resolve_commission_rate(product, plan, vendor_id)

    if product.is_platform_sold or not vendor_id:
        processing_pct = plan.payment_processing_percent if plan else Decimal("2.9")
        processing_fixed = plan.payment_processing_fixed if plan else Decimal("0.30")
        processing_fee = _money(line_subtotal * processing_pct / Decimal("100") + processing_fixed)
        return {
            "source_type": product.source_type,
            "vendor_id": None,
            "line_subtotal": line_subtotal,
            "commission_rate": Decimal("0"),
            "platform_fee": Decimal("0"),
            "payment_processing_fee": processing_fee,
            "vendor_earnings": Decimal("0"),
            "platform_revenue": _money(line_subtotal - processing_fee),
        }

    platform_fee = _money(line_subtotal * commission_rate / Decimal("100"))
    processing_pct = plan.payment_processing_percent if plan else Decimal("2.9")
    processing_fixed = plan.payment_processing_fixed if plan else Decimal("0.30")
    processing_fee = _money(line_subtotal * processing_pct / Decimal("100") + processing_fixed)
    vendor_earnings = _money(line_subtotal - platform_fee - processing_fee)

    return {
        "source_type": ProductSourceType.VENDOR,
        "vendor_id": vendor_id,
        "line_subtotal": line_subtotal,
        "commission_rate": commission_rate,
        "platform_fee": platform_fee,
        "payment_processing_fee": processing_fee,
        "vendor_earnings": max(vendor_earnings, Decimal("0")),
        "platform_revenue": platform_fee,
    }


def record_vendor_ledger(order_item) -> None:
    """Credit seller balance after payment clears. Idempotent per order line."""
    if not order_item.vendor_id:
        return
    if VendorLedgerEntry.objects.filter(
        order_item_id=order_item.id, entry_type=LedgerEntryType.SALE
    ).exists():
        return
    if order_item.line_subtotal <= 0:
        return

    VendorLedgerEntry.objects.create(
        vendor_id=order_item.vendor_id,
        order_item=order_item,
        entry_type=LedgerEntryType.SALE,
        amount=order_item.line_subtotal,
        note=f"Sale: {order_item.title_snapshot}",
    )
    if order_item.platform_fee > 0:
        VendorLedgerEntry.objects.create(
            vendor_id=order_item.vendor_id,
            order_item=order_item,
            entry_type=LedgerEntryType.COMMISSION,
            amount=-order_item.platform_fee,
            note=f"Platform commission ({order_item.commission_rate}%)",
        )
    if order_item.payment_processing_fee > 0:
        VendorLedgerEntry.objects.create(
            vendor_id=order_item.vendor_id,
            order_item=order_item,
            entry_type=LedgerEntryType.PROCESSING,
            amount=-order_item.payment_processing_fee,
            note="Payment processing fee",
        )


def record_vendor_ledger_for_order(order) -> None:
    """Post ledger for all seller lines on an order (call on payment approval)."""
    from shop.models import OrderItem

    for item in OrderItem.objects.filter(order_id=order.id).exclude(vendor_id=None):
        record_vendor_ledger(item)


def charge_listing_fee(product: Product) -> VendorLedgerEntry | None:
    """Debit listing fee once when a vendor product is approved/published (Etsy-style)."""
    if not product.vendor_id or product.listing_fee_paid:
        return None
    if product.source_type != ProductSourceType.VENDOR:
        return None
    plan = get_commission_plan_for_seller(product.vendor_id) or get_default_commission_plan()
    fee = plan.listing_fee if plan else Decimal("0")
    if fee <= 0:
        product.listing_fee_paid = True
        product.save(update_fields=["listing_fee_paid"])
        return None
    entry = VendorLedgerEntry.objects.create(
        vendor_id=product.vendor_id,
        order_item=None,
        entry_type=LedgerEntryType.LISTING_FEE,
        amount=-_money(fee),
        note=f"Listing fee: {product.title}"[:255],
    )
    try:
        from accounts.models import User
        from shop.models import PlatformLedgerType
        from shop.services.finance import post_platform_ledger

        seller = User.objects.filter(id=product.vendor_id).first()
        post_platform_ledger(
            entry_type=PlatformLedgerType.LISTING_FEE_INCOME,
            amount=_money(fee),
            note=f"Product listing fee: {product.title}"[:255],
            related_user=seller,
            reference=f"prod-list-{product.id}",
        )
    except Exception:
        pass
    product.listing_fee_paid = True
    product.save(update_fields=["listing_fee_paid"])
    return entry


def reverse_vendor_ledger_for_items(items, *, note: str = "Partial refund") -> None:
    """Reverse ledger for specific order lines. Idempotent per line via REFUND rows."""
    from django.db.models import Sum

    for item in items:
        if not getattr(item, "vendor_id", None):
            continue
        if VendorLedgerEntry.objects.filter(
            order_item_id=item.id, entry_type=LedgerEntryType.REFUND
        ).exists():
            continue
        net = VendorLedgerEntry.objects.filter(order_item_id=item.id).aggregate(
            total=Sum("amount")
        )["total"] or Decimal("0")
        if net == 0:
            continue
        VendorLedgerEntry.objects.create(
            vendor_id=item.vendor_id,
            order_item=item,
            entry_type=LedgerEntryType.REFUND,
            amount=-net,
            note=note[:255],
        )


def reverse_vendor_ledger_for_order(order, *, note: str = "Order cancelled / refunded") -> None:
    """Zero seller ledger for an order. Idempotent via REFUND rows."""
    from shop.models import OrderItem

    reverse_vendor_ledger_for_items(
        OrderItem.objects.filter(order_id=order.id).exclude(vendor_id=None),
        note=note,
    )


def vendor_product_defaults(vendor_id: int) -> dict:
    return {
        "vendor_id": vendor_id,
        "source_type": ProductSourceType.VENDOR,
        "approval_status": ProductApprovalStatus.PENDING,
        "status": "draft",
    }


def platform_product_defaults(source_type: str = ProductSourceType.PLATFORM_OWN) -> dict:
    return {
        "vendor_id": None,
        "source_type": source_type,
        "approval_status": ProductApprovalStatus.NOT_REQUIRED,
    }


def seed_default_commission_plans() -> None:
    """Industry-aligned defaults: Chewy-style platform retail + Etsy/Amazon hybrid seller fees."""
    plans = [
        {
            "slug": "standard",
            "name": "Standard Seller",
            "description": "Free to list (Daraz-style). Category rates apply when set; else 10%.",
            "commission_percent": Decimal("10.00"),
            "listing_fee": Decimal("0"),
            "setup_fee": Decimal("0"),
            "subscription_monthly_fee": Decimal("0"),
            "applies_to": CommissionAppliesTo.ALL_SELLERS,
            "is_default": True,
        },
        {
            "slug": "pro",
            "name": "Pro Seller",
            "description": "Lower default rate + tools for power sellers (optional paid tier).",
            "commission_percent": Decimal("8.00"),
            "listing_fee": Decimal("0"),
            "setup_fee": Decimal("0"),
            "subscription_monthly_fee": Decimal("499.00"),
            "applies_to": CommissionAppliesTo.VENDOR_TIER_PRO,
            "is_default": False,
        },
        {
            "slug": "enterprise",
            "name": "Enterprise Brand",
            "description": "Negotiated rate for major pet brands.",
            "commission_percent": Decimal("5.00"),
            "listing_fee": Decimal("0"),
            "setup_fee": Decimal("0"),
            "subscription_monthly_fee": Decimal("1499.00"),
            "applies_to": CommissionAppliesTo.VENDOR_TIER_ENTERPRISE,
            "is_default": False,
        },
        {
            "slug": "services",
            "name": "Services & Clinics",
            "description": "Take rate for vet invoices and booked services.",
            "commission_percent": Decimal("8.00"),
            "listing_fee": Decimal("0"),
            "setup_fee": Decimal("0"),
            "subscription_monthly_fee": Decimal("0"),
            "applies_to": CommissionAppliesTo.ALL_SELLERS,
            "is_default": False,
        },
        {
            "slug": "live-animal",
            "name": "Live Animal Sellers",
            "description": "Take rate for breeder / trader / shelter sales; small listing fee on publish.",
            "commission_percent": Decimal("10.00"),
            "listing_fee": Decimal("25.00"),
            "setup_fee": Decimal("0"),
            "subscription_monthly_fee": Decimal("0"),
            "applies_to": CommissionAppliesTo.ALL_SELLERS,
            "is_default": False,
        },
    ]
    for data in plans:
        CommissionPlan.objects.update_or_create(slug=data["slug"], defaults={**data, "is_active": True})
    seed_category_commission_rates()


def seed_category_commission_rates() -> None:
    """Daraz-inspired category take rates for pet + general catalogs."""
    from shop.models import ProductCategory

    # slug → percent (parents first; children inherit if blank)
    rates = {
        "pet-food": Decimal("8.00"),
        "dry-food": Decimal("8.00"),
        "kitten-food": Decimal("8.00"),
        "wet-food": Decimal("8.00"),
        "milk-replacer": Decimal("8.00"),
        "feeding": Decimal("10.00"),
        "litter-waste": Decimal("10.00"),
        "cat-litter": Decimal("10.00"),
        "toys-play": Decimal("12.00"),
        "cat-toy": Decimal("12.00"),
        "catnip": Decimal("12.00"),
        "accessories": Decimal("12.00"),
        "grooming": Decimal("12.00"),
        "health-medicine": Decimal("10.00"),
        "cat-care-health": Decimal("10.00"),
        "pet-supplements": Decimal("10.00"),
        "cat-tick-flea-controls": Decimal("10.00"),
        "beds-comfort": Decimal("12.00"),
        "cat-bed": Decimal("12.00"),
        "cat-house": Decimal("12.00"),
        "travel-carriers": Decimal("12.00"),
        "training": Decimal("12.00"),
        "general-electronics": Decimal("12.00"),
        "general-fashion": Decimal("14.00"),
        "general-home-living": Decimal("12.00"),
        "general-health-beauty": Decimal("12.00"),
        "general-sports-outdoors": Decimal("12.00"),
        "general-books-stationery": Decimal("10.00"),
    }
    for slug, pct in rates.items():
        ProductCategory.objects.filter(slug=slug).update(commission_percent=pct)
