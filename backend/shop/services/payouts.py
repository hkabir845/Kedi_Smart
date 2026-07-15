"""Vendor payout request + settlement helpers."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from shop.models import (
    LedgerEntryType,
    OrderItem,
    PayoutStatus,
    VendorLedgerEntry,
    VendorPayout,
)


class PayoutError(Exception):
    pass


def vendor_available_balance(vendor_id: int) -> Decimal:
    """Cleared ledger minus payouts still awaiting disbursement."""
    ledger = VendorLedgerEntry.objects.filter(vendor_id=vendor_id).aggregate(total=Sum("amount"))[
        "total"
    ] or Decimal("0")
    pending = VendorPayout.objects.filter(
        vendor_id=vendor_id, status__in=[PayoutStatus.PENDING, PayoutStatus.PROCESSING]
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    return ledger - pending


@transaction.atomic
def request_vendor_payout(vendor, *, amount: Decimal | None = None, note: str = "") -> VendorPayout:
    available = vendor_available_balance(vendor.id)
    if amount is None:
        amount = available
    amount = Decimal(str(amount)).quantize(Decimal("0.01"))
    if amount <= 0:
        raise PayoutError("Nothing available to payout")
    if amount > available:
        raise PayoutError(f"Requested amount exceeds available balance ({available})")

    # Require some cleared earnings
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

    # Idempotent ledger debit
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
    return payout
