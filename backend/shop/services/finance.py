"""Platform owner finance summary, P&L, and fee charging helpers."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Q, Sum
from django.utils import timezone

from accounts.models import SellerAccount, VendorProfile
from shop.models import (
    ExpenseBill,
    ExpenseKind,
    ExpenseStatus,
    LedgerEntryType,
    Order,
    OrderItem,
    PlatformLedgerEntry,
    PlatformLedgerType,
    ProductSourceType,
    VendorLedgerEntry,
    VendorPayout,
    PayoutStatus,
)


def _money(value: Decimal | float | int | None) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _period_bounds(year: int | None = None, month: int | None = None):
    today = timezone.localdate()
    y = year or today.year
    m = month or today.month
    start = date(y, m, 1)
    end = date(y, m, monthrange(y, m)[1])
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end, time.max), tz)
    return start, end, start_dt, end_dt, y, m


def post_platform_ledger(
    *,
    entry_type: str,
    amount: Decimal,
    note: str = "",
    related_user=None,
    order_item=None,
    reference: str = "",
) -> PlatformLedgerEntry:
    return PlatformLedgerEntry.objects.create(
        entry_type=entry_type,
        amount=_money(amount),
        note=(note or "")[:255],
        related_user=related_user,
        order_item=order_item,
        reference=(reference or "")[:80],
    )


def record_platform_sale_from_order_item(order_item: OrderItem) -> None:
    """Post platform product revenue + COGS when payment clears (idempotent)."""
    product = getattr(order_item, "variant", None)
    product = product.product if product else None
    if not product or not product.is_platform_sold:
        return
    ref = f"oi-sale-{order_item.id}"
    if PlatformLedgerEntry.objects.filter(reference=ref).exists():
        return

    revenue = _money(order_item.platform_revenue or order_item.line_subtotal)
    post_platform_ledger(
        entry_type=PlatformLedgerType.PRODUCT_SALES,
        amount=revenue,
        note=f"Platform sale: {order_item.title_snapshot}"[:255],
        order_item=order_item,
        reference=ref,
    )
    if order_item.payment_processing_fee and order_item.payment_processing_fee > 0:
        post_platform_ledger(
            entry_type=PlatformLedgerType.PROCESSING_EXPENSE,
            amount=-_money(order_item.payment_processing_fee),
            note="Estimated payment processing",
            order_item=order_item,
            reference=f"oi-proc-{order_item.id}",
        )
    variant = order_item.variant
    if variant and variant.cost_price is not None:
        cogs = _money(Decimal(variant.cost_price) * int(order_item.qty or 0))
        if cogs > 0:
            post_platform_ledger(
                entry_type=PlatformLedgerType.COGS,
                amount=-cogs,
                note=f"COGS: {order_item.title_snapshot}"[:255],
                order_item=order_item,
                reference=f"oi-cogs-{order_item.id}",
            )


def record_platform_commission_from_order_item(order_item: OrderItem) -> None:
    if not order_item.vendor_id or not order_item.platform_fee:
        return
    ref = f"oi-comm-{order_item.id}"
    if PlatformLedgerEntry.objects.filter(reference=ref).exists():
        return
    from accounts.models import User

    seller = User.objects.filter(id=order_item.vendor_id).first()
    post_platform_ledger(
        entry_type=PlatformLedgerType.COMMISSION_INCOME,
        amount=_money(order_item.platform_fee),
        note=f"Commission: {order_item.title_snapshot}"[:255],
        related_user=seller,
        order_item=order_item,
        reference=ref,
    )


def sync_platform_ledger_for_order(order) -> None:
    for item in OrderItem.objects.filter(order_id=order.id).select_related("variant__product"):
        if item.vendor_id:
            record_platform_commission_from_order_item(item)
        else:
            record_platform_sale_from_order_item(item)


def charge_setup_fee(seller_user) -> VendorLedgerEntry | None:
    """One-time onboarding fee when seller is approved."""
    from shop.services.commission import get_commission_plan_for_seller, _money as cmoney

    profile = None
    if hasattr(seller_user, "vendor_profile"):
        try:
            profile = seller_user.vendor_profile
        except VendorProfile.DoesNotExist:
            profile = None
    if profile is None:
        profile = VendorProfile.objects.filter(user_id=seller_user.id).first()
    account = None
    if profile is None:
        account = SellerAccount.objects.filter(user_id=seller_user.id).first()

    target = profile or account
    if not target or getattr(target, "setup_fee_paid", False):
        return None

    plan = get_commission_plan_for_seller(seller_user.id)
    fee = plan.setup_fee if plan else Decimal("0")
    if fee <= 0:
        target.setup_fee_paid = True
        target.save(update_fields=["setup_fee_paid"])
        return None

    entry = VendorLedgerEntry.objects.create(
        vendor_id=seller_user.id,
        entry_type=LedgerEntryType.SETUP_FEE,
        amount=-cmoney(fee),
        note="One-time seller setup / onboarding fee",
    )
    post_platform_ledger(
        entry_type=PlatformLedgerType.SETUP_FEE_INCOME,
        amount=cmoney(fee),
        note=f"Setup fee — seller #{seller_user.id}",
        related_user=seller_user,
        reference=f"setup-{seller_user.id}",
    )
    target.setup_fee_paid = True
    target.save(update_fields=["setup_fee_paid"])
    return entry


def charge_seller_subscription(seller_user, *, force: bool = False) -> VendorLedgerEntry | None:
    """Charge monthly subscription if due (not charged in current calendar month)."""
    from shop.services.commission import get_commission_plan_for_seller, _money as cmoney

    profile = VendorProfile.objects.filter(user_id=seller_user.id).first()
    account = None if profile else SellerAccount.objects.filter(user_id=seller_user.id).first()
    target = profile or account
    if not target or not target.is_active:
        return None

    plan = get_commission_plan_for_seller(seller_user.id)
    fee = plan.subscription_monthly_fee if plan else Decimal("0")
    if fee <= 0:
        return None

    last = target.subscription_last_charged_at
    now = timezone.now()
    if not force and last and last.year == now.year and last.month == now.month:
        return None

    entry = VendorLedgerEntry.objects.create(
        vendor_id=seller_user.id,
        entry_type=LedgerEntryType.SUBSCRIPTION,
        amount=-cmoney(fee),
        note=f"Monthly subscription ({plan.slug if plan else 'plan'})",
    )
    post_platform_ledger(
        entry_type=PlatformLedgerType.SUBSCRIPTION_INCOME,
        amount=cmoney(fee),
        note=f"Subscription — seller #{seller_user.id}",
        related_user=seller_user,
        reference=f"sub-{seller_user.id}-{now.year}{now.month:02d}",
    )
    target.subscription_last_charged_at = now
    target.save(update_fields=["subscription_last_charged_at"])
    return entry


def charge_all_due_subscriptions(*, force: bool = False) -> dict:
    from accounts.models import User

    seller_ids = set(
        VendorProfile.objects.filter(is_active=True, is_approved=True).values_list("user_id", flat=True)
    ) | set(
        SellerAccount.objects.filter(is_active=True, is_approved=True).values_list("user_id", flat=True)
    )
    charged = 0
    skipped = 0
    for uid in seller_ids:
        user = User.objects.filter(id=uid).first()
        if not user:
            continue
        if charge_seller_subscription(user, force=force):
            charged += 1
        else:
            skipped += 1
    return {"charged": charged, "skipped": skipped, "sellers": len(seller_ids)}


def charge_pet_listing_fee(listing) -> VendorLedgerEntry | None:
    """Insertion fee when a live-animal listing is published."""
    from shop.services.commission import get_commission_plan_for_seller, _money as cmoney
    from shop.models import CommissionPlan

    if getattr(listing, "listing_fee_paid", False):
        return None
    if listing.type in ("adoption", "giveaway"):
        listing.listing_fee_paid = True
        listing.save(update_fields=["listing_fee_paid"])
        return None

    plan = get_commission_plan_for_seller(listing.seller_id)
    if not plan or plan.slug != "live-animal":
        plan = CommissionPlan.objects.filter(slug="live-animal", is_active=True).first() or plan
    fee = plan.listing_fee if plan else Decimal("0")
    if fee <= 0:
        listing.listing_fee_paid = True
        listing.save(update_fields=["listing_fee_paid"])
        return None

    entry = VendorLedgerEntry.objects.create(
        vendor_id=listing.seller_id,
        entry_type=LedgerEntryType.LISTING_FEE,
        amount=-cmoney(fee),
        note=f"Pet listing fee: {listing.species} {listing.breed or ''}".strip()[:255],
    )
    from accounts.models import User

    seller = User.objects.filter(id=listing.seller_id).first()
    post_platform_ledger(
        entry_type=PlatformLedgerType.LISTING_FEE_INCOME,
        amount=cmoney(fee),
        note=f"Pet listing #{listing.id}",
        related_user=seller,
        reference=f"pet-list-{listing.id}",
    )
    listing.listing_fee_paid = True
    listing.save(update_fields=["listing_fee_paid"])
    return entry


def next_expense_number(*, kind: str, is_platform: bool) -> str:
    year = timezone.localdate().year
    prefix = {
        ExpenseKind.EXPENSE: "KS-EXP",
        ExpenseKind.BILL: "KS-BILL",
        ExpenseKind.INCOME: "KS-INC",
    }.get(kind, "KS-EXP")
    if not is_platform:
        prefix = prefix.replace("KS-", "KS-S-")
    last = (
        ExpenseBill.objects.filter(number__startswith=f"{prefix}-{year}-")
        .order_by("-number")
        .values_list("number", flat=True)
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(str(last).rsplit("-", 1)[-1]) + 1
        except ValueError:
            seq = ExpenseBill.objects.filter(number__startswith=f"{prefix}-{year}-").count() + 1
    return f"{prefix}-{year}-{seq:05d}"


def create_expense_bill(*, owner, data: dict, is_platform: bool = False) -> ExpenseBill:
    kind = data.get("kind") or ExpenseKind.EXPENSE
    if kind not in {c.value for c in ExpenseKind}:
        kind = ExpenseKind.EXPENSE
    category = data.get("category") or "other"
    amount = _money(data.get("amount"))
    if amount <= 0:
        raise ValueError("Amount must be positive")
    issued = data.get("issued_at") or timezone.localdate().isoformat()
    if isinstance(issued, str):
        issued_date = date.fromisoformat(issued[:10])
    else:
        issued_date = issued

    status = data.get("status") or ExpenseStatus.POSTED
    bill = ExpenseBill.objects.create(
        owner=owner,
        is_platform=is_platform,
        kind=kind,
        category=category,
        number=next_expense_number(kind=kind, is_platform=is_platform),
        title=(data.get("title") or "Expense").strip()[:255],
        counterparty=(data.get("counterparty") or "").strip()[:255],
        amount=amount,
        currency=(data.get("currency") or "BDT")[:3],
        status=status,
        issued_at=issued_date,
        paid_at=timezone.now() if status == ExpenseStatus.PAID else None,
        notes=(data.get("notes") or "").strip(),
    )
    if is_platform and status in (ExpenseStatus.POSTED, ExpenseStatus.PAID):
        if kind == ExpenseKind.INCOME:
            post_platform_ledger(
                entry_type=PlatformLedgerType.PRODUCT_SALES,
                amount=amount,
                note=f"Other income: {bill.title}"[:255],
                related_user=owner,
                reference=f"exp-{bill.id}",
            )
        else:
            pl_type = PlatformLedgerType.COGS if category == "cogs" else PlatformLedgerType.EXPENSE
            post_platform_ledger(
                entry_type=pl_type,
                amount=-amount,
                note=f"{bill.get_kind_display()}: {bill.title}"[:255],
                related_user=owner,
                reference=f"exp-{bill.id}",
            )
    return bill


def serialize_expense(bill: ExpenseBill) -> dict:
    return {
        "id": bill.id,
        "number": bill.number,
        "kind": bill.kind,
        "category": bill.category,
        "title": bill.title,
        "counterparty": bill.counterparty,
        "amount": float(bill.amount),
        "currency": bill.currency,
        "status": bill.status,
        "issued_at": bill.issued_at.isoformat() if bill.issued_at else None,
        "paid_at": bill.paid_at.isoformat() if bill.paid_at else None,
        "notes": bill.notes,
        "is_platform": bill.is_platform,
        "owner_id": bill.owner_id,
    }


def platform_finance_report(*, year: int | None = None, month: int | None = None) -> dict:
    """Owner dashboard: GMV, take-rate income, COGS, expenses, P&L, payables."""
    start, end, start_dt, end_dt, y, m = _period_bounds(year, month)

    gmv = Order.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt).aggregate(
        t=Sum("total")
    )["t"] or Decimal("0")
    delivered_gmv = Order.objects.filter(
        status="delivered", created_at__gte=start_dt, created_at__lte=end_dt
    ).aggregate(t=Sum("total"))["t"] or Decimal("0")

    # Line-level take
    lines = OrderItem.objects.filter(order__created_at__gte=start_dt, order__created_at__lte=end_dt)
    commission = lines.aggregate(t=Sum("platform_fee"))["t"] or Decimal("0")
    platform_sku_revenue = (
        lines.filter(
            Q(vendor_id__isnull=True)
            | Q(source_type__in=[ProductSourceType.PLATFORM_OWN, ProductSourceType.PLATFORM_BRAND])
        ).aggregate(t=Sum("platform_revenue"))["t"]
        or Decimal("0")
    )
    processing_on_platform = (
        lines.filter(
            Q(vendor_id__isnull=True)
            | Q(source_type__in=[ProductSourceType.PLATFORM_OWN, ProductSourceType.PLATFORM_BRAND])
        ).aggregate(t=Sum("payment_processing_fee"))["t"]
        or Decimal("0")
    )

    # Estimated COGS for platform lines with cost_price
    cogs = Decimal("0")
    for item in lines.filter(
        Q(vendor_id__isnull=True)
        | Q(source_type__in=[ProductSourceType.PLATFORM_OWN, ProductSourceType.PLATFORM_BRAND])
    ).select_related("variant"):
        if item.variant_id and item.variant and item.variant.cost_price is not None:
            cogs += _money(Decimal(item.variant.cost_price) * int(item.qty or 0))

    seller_ledger = VendorLedgerEntry.objects.filter(
        created_at__gte=start_dt, created_at__lte=end_dt
    )
    listing_fees = abs(
        seller_ledger.filter(entry_type=LedgerEntryType.LISTING_FEE).aggregate(t=Sum("amount"))["t"]
        or Decimal("0")
    )
    subscriptions = abs(
        seller_ledger.filter(entry_type=LedgerEntryType.SUBSCRIPTION).aggregate(t=Sum("amount"))["t"]
        or Decimal("0")
    )
    setup_fees = abs(
        seller_ledger.filter(entry_type=LedgerEntryType.SETUP_FEE).aggregate(t=Sum("amount"))["t"]
        or Decimal("0")
    )

    platform_expenses = ExpenseBill.objects.filter(
        is_platform=True,
        kind__in=[ExpenseKind.EXPENSE, ExpenseKind.BILL],
        status__in=[ExpenseStatus.POSTED, ExpenseStatus.PAID],
        issued_at__gte=start,
        issued_at__lte=end,
    ).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    other_income = ExpenseBill.objects.filter(
        is_platform=True,
        kind=ExpenseKind.INCOME,
        status__in=[ExpenseStatus.POSTED, ExpenseStatus.PAID],
        issued_at__gte=start,
        issued_at__lte=end,
    ).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    pending_payouts = VendorPayout.objects.filter(
        status__in=[PayoutStatus.PENDING, PayoutStatus.PROCESSING]
    ).aggregate(t=Sum("amount"))["t"] or Decimal("0")
    paid_payouts = VendorPayout.objects.filter(
        status=PayoutStatus.PAID, paid_at__gte=start_dt, paid_at__lte=end_dt
    ).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    # Available seller balances (liability)
    seller_payable = VendorLedgerEntry.objects.aggregate(t=Sum("amount"))["t"] or Decimal("0")

    gross_profit_platform_sku = _money(platform_sku_revenue - processing_on_platform - cogs)
    marketplace_income = _money(commission + listing_fees + subscriptions + setup_fees)
    total_income = _money(platform_sku_revenue + marketplace_income + other_income)
    total_costs = _money(cogs + processing_on_platform + platform_expenses)
    net_profit = _money(total_income - total_costs)

    return {
        "period": {
            "year": y,
            "month": m,
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
        "gmv": float(_money(gmv)),
        "delivered_gmv": float(_money(delivered_gmv)),
        "income": {
            "platform_product_sales": float(_money(platform_sku_revenue)),
            "commission": float(_money(commission)),
            "listing_fees": float(_money(listing_fees)),
            "subscriptions": float(_money(subscriptions)),
            "setup_fees": float(_money(setup_fees)),
            "other_income": float(_money(other_income)),
            "marketplace_income": float(marketplace_income),
            "total": float(total_income),
        },
        "costs": {
            "cogs": float(_money(cogs)),
            "processing_est": float(_money(processing_on_platform)),
            "operating_expenses": float(_money(platform_expenses)),
            "total": float(total_costs),
        },
        "profit": {
            "gross_platform_sku": float(gross_profit_platform_sku),
            "net": float(net_profit),
            "take_rate_pct": float(
                _money((marketplace_income / gmv * 100) if gmv else Decimal("0"))
            ),
        },
        "payables": {
            "seller_balances": float(_money(seller_payable)),
            "pending_payouts": float(_money(pending_payouts)),
            "paid_payouts_period": float(_money(paid_payouts)),
        },
    }
