"""Vendor payout request + settlement helpers (Daraz-style clearance holds)."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from shop.models import (
    LedgerEntryType,
    OrderItem,
    OrderStatus,
    PayoutStatus,
    VendorLedgerEntry,
    VendorPayout,
)

# Earnings stay on hold until delivery + this many days (returns / RTO buffer).
PAYOUT_HOLD_DAYS = 3
PAYOUT_CLEARED_STATUSES = {OrderStatus.DELIVERED}


class PayoutError(Exception):
    pass


def _order_cleared_for_payout(order) -> bool:
    if order.status not in PAYOUT_CLEARED_STATUSES:
        return False
    # Hold window after the order last moved (proxy for delivered_at).
    cutoff = timezone.now() - timedelta(days=PAYOUT_HOLD_DAYS)
    stamp = order.updated_at or order.created_at
    return bool(stamp and stamp <= cutoff)


def vendor_balance_breakdown(vendor_id: int) -> dict:
    """Total ledger, amount still clearing, pending payouts, and withdrawable cash."""
    ledger = VendorLedgerEntry.objects.filter(vendor_id=vendor_id).aggregate(total=Sum("amount"))[
        "total"
    ] or Decimal("0")
    pending = VendorPayout.objects.filter(
        vendor_id=vendor_id, status__in=[PayoutStatus.PENDING, PayoutStatus.PROCESSING]
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    held = Decimal("0")
    order_entries = (
        VendorLedgerEntry.objects.filter(vendor_id=vendor_id, order_item_id__isnull=False)
        .select_related("order_item__order")
        .only("amount", "order_item_id", "order_item__order__status", "order_item__order__updated_at", "order_item__order__created_at")
    )
    for entry in order_entries:
        order = entry.order_item.order if entry.order_item_id else None
        if order and not _order_cleared_for_payout(order):
            held += entry.amount

    available = ledger - pending - held
    return {
        "ledger_balance": ledger,
        "held_for_clearance": held,
        "pending_payout": pending,
        "available_for_payout": available,
        "hold_days": PAYOUT_HOLD_DAYS,
    }


def vendor_available_balance(vendor_id: int) -> Decimal:
    """Cleared ledger minus holds and payouts still awaiting disbursement."""
    return vendor_balance_breakdown(vendor_id)["available_for_payout"]


@transaction.atomic
def request_vendor_payout(vendor, *, amount: Decimal | None = None, note: str = "") -> VendorPayout:
    available = vendor_available_balance(vendor.id)
    if amount is None:
        amount = available
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= 0:
        raise PayoutError(
            f"Nothing available to payout yet. Sales clear {PAYOUT_HOLD_DAYS} days after delivery."
        )
    if amount > available:
        raise PayoutError(f"Requested amount exceeds available balance ({available})")

    has_sales = OrderItem.objects.filter(vendor_id=vendor.id).exists()
    if not has_sales and available <= 0:
        raise PayoutError("No earnings to withdraw yet")

    return VendorPayout.objects.create(
        vendor_id=vendor.id,
        amount=amount,
        status=PayoutStatus.PENDING,
        period_end=timezone.localdate(),
        admin_note=(note or "")[:500] or None,
    )


@transaction.atomic
def mark_payout_paid(payout: VendorPayout, *, reference: str | None = None, admin_note: str | None = None) -> VendorPayout:
    if payout.status == PayoutStatus.PAID:
        return payout
    payout.status = PayoutStatus.PAID
    payout.paid_at = timezone.now()
    if reference:
        payout.reference = reference
    if admin_note:
        payout.admin_note = admin_note
    payout.save()

    note = f"Payout #{payout.id}"
    exists = VendorLedgerEntry.objects.filter(
        vendor_id=payout.vendor_id,
        entry_type=LedgerEntryType.PAYOUT,
        note=note,
    ).exists()
    if not exists:
        VendorLedgerEntry.objects.create(
            vendor_id=payout.vendor_id,
            order_item=None,
            entry_type=LedgerEntryType.PAYOUT,
            amount=-payout.amount,
            note=note,
        )
        try:
            from shop.models import PlatformLedgerType
            from shop.services.finance import post_platform_ledger

            post_platform_ledger(
                entry_type=PlatformLedgerType.PAYOUT,
                amount=-payout.amount,
                note=f"Seller payout #{payout.id}",
                related_user=payout.vendor,
                reference=f"payout-{payout.id}",
            )
        except Exception:
            pass
    return payout
