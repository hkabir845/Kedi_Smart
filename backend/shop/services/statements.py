"""Monthly vendor settlement statements (query + optional persist)."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from shop.models import LedgerEntryType, VendorLedgerEntry, VendorStatement


def _month_bounds(year: int, month: int) -> tuple[date, date, datetime, datetime]:
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end, time.max), tz)
    return start, end, start_dt, end_dt


def build_vendor_statement(vendor_id: int, *, year: int, month: int, persist: bool = True) -> dict:
    start, end, start_dt, end_dt = _month_bounds(year, month)
    qs = VendorLedgerEntry.objects.filter(
        vendor_id=vendor_id, created_at__gte=start_dt, created_at__lte=end_dt
    )

    def _sum(entry_type: str) -> Decimal:
        return qs.filter(entry_type=entry_type).aggregate(t=Sum("amount"))["t"] or Decimal("0")

    sales = _sum(LedgerEntryType.SALE)
    commission = abs(_sum(LedgerEntryType.COMMISSION))
    # New PROCESSING type + legacy commission rows noted as payment processing
    processing_typed = abs(_sum(LedgerEntryType.PROCESSING))
    processing_legacy = abs(
        qs.filter(entry_type=LedgerEntryType.COMMISSION, note__icontains="processing").aggregate(
            t=Sum("amount")
        )["t"]
        or Decimal("0")
    )
    # Avoid double-counting: if note match, those rows are already in commission sum
    platform_fees = commission - processing_legacy
    processing_fees = processing_typed + processing_legacy
    listing = abs(_sum(LedgerEntryType.LISTING_FEE))
    subscriptions = abs(_sum(LedgerEntryType.SUBSCRIPTION))
    setup_fees = abs(_sum(LedgerEntryType.SETUP_FEE))
    refunds = abs(_sum(LedgerEntryType.REFUND))
    payouts = abs(_sum(LedgerEntryType.PAYOUT))
    net = sales - platform_fees - processing_fees - listing - subscriptions - setup_fees - refunds - payouts

    payload = {
        "vendor_id": vendor_id,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "year": year,
        "month": month,
        "gross_sales": float(sales),
        "platform_fees": float(platform_fees),
        "processing_fees": float(processing_fees),
        "listing_fees": float(listing + subscriptions + setup_fees),
        "subscriptions": float(subscriptions),
        "setup_fees": float(setup_fees),
        "refunds": float(refunds),
        "payouts": float(payouts),
        "net": float(net),
        "status": "finalized",
    }

    if persist:
        obj, _ = VendorStatement.objects.update_or_create(
            vendor_id=vendor_id,
            period_start=start,
            period_end=end,
            defaults={
                "gross_sales": sales,
                "platform_fees": platform_fees,
                "processing_fees": processing_fees,
                "listing_fees": listing + subscriptions + setup_fees,
                "refunds": refunds,
                "payouts": payouts,
                "net": net,
                "status": "finalized",
            },
        )
        payload["id"] = obj.id
    return payload


def list_vendor_statements(vendor_id: int, *, limit: int = 24) -> list[dict]:
    rows = VendorStatement.objects.filter(vendor_id=vendor_id).order_by("-period_end")[:limit]
    if rows:
        return [
            {
                "id": r.id,
                "vendor_id": r.vendor_id,
                "period_start": r.period_start.isoformat(),
                "period_end": r.period_end.isoformat(),
                "gross_sales": float(r.gross_sales),
                "platform_fees": float(r.platform_fees),
                "processing_fees": float(r.processing_fees),
                "listing_fees": float(r.listing_fees),
                "refunds": float(r.refunds),
                "payouts": float(r.payouts),
                "net": float(r.net),
                "status": r.status,
            }
            for r in rows
        ]
    today = timezone.localdate()
    out = []
    y, m = today.year, today.month
    for _ in range(min(limit, 6)):
        out.append(build_vendor_statement(vendor_id, year=y, month=m, persist=False))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    return out
