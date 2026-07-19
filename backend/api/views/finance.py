"""Platform finance, P&L, and expense/bill APIs."""

from calendar import monthrange
from datetime import date

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import UserRole
from api.authentication import JWTAuthentication, require_roles
from shop.models import ExpenseBill, ExpenseKind, ExpenseStatus
from shop.services.finance import (
    charge_all_due_subscriptions,
    create_expense_bill,
    platform_finance_report,
    serialize_expense,
)
from shop.services.payouts import PAYOUT_HOLD_DAYS

SELLER_ROLES = (
    UserRole.VENDOR,
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
)


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def admin_finance(request):
    year = request.query_params.get("year")
    month = request.query_params.get("month")
    report = platform_finance_report(
        year=int(year) if year else None,
        month=int(month) if month else None,
    )
    return Response(report)


@api_view(["POST"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def admin_charge_subscriptions(request):
    force = bool(request.data.get("force"))
    result = charge_all_due_subscriptions(force=force)
    return Response(result)


@api_view(["GET", "POST"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def admin_expenses(request):
    if request.method == "GET":
        qs = ExpenseBill.objects.filter(is_platform=True).order_by("-issued_at", "-id")[:200]
        return Response([serialize_expense(b) for b in qs])

    try:
        bill = create_expense_bill(owner=request.user, data=request.data, is_platform=True)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serialize_expense(bill), status=status.HTTP_201_CREATED)


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES)
def seller_expenses(request):
    if request.method == "GET":
        qs = ExpenseBill.objects.filter(owner_id=request.user.id, is_platform=False).order_by(
            "-issued_at", "-id"
        )[:200]
        return Response([serialize_expense(b) for b in qs])

    try:
        bill = create_expense_bill(owner=request.user, data=request.data, is_platform=False)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serialize_expense(bill), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES, UserRole.ADMIN, UserRole.SUPER_ADMIN)
def expense_mark_paid(request, expense_id):
    bill = ExpenseBill.objects.filter(id=expense_id).first()
    if not bill:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    is_admin = user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    if not is_admin and bill.owner_id != user.id:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
    if bill.is_platform and not is_admin:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    from django.utils import timezone

    bill.status = ExpenseStatus.PAID
    bill.paid_at = timezone.now()
    bill.save(update_fields=["status", "paid_at", "updated_at"])
    return Response(serialize_expense(bill))


def _period_bounds(year: int | None, month: int | None) -> tuple[date | None, date | None]:
    if not year or not month:
        return None, None
    if month < 1 or month > 12:
        return None, None
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return start, end


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES)
def seller_finance_summary(request):
    """Compact seller P&L from ledger + their expense books (optional year/month filter)."""
    from django.db.models import Sum
    from shop.models import LedgerEntryType, VendorLedgerEntry
    from shop.services.payouts import vendor_available_balance

    user = request.user
    try:
        year = int(request.query_params["year"]) if request.query_params.get("year") else None
        month = int(request.query_params["month"]) if request.query_params.get("month") else None
    except (TypeError, ValueError):
        year = month = None
    start, end = _period_bounds(year, month)

    ledger = VendorLedgerEntry.objects.filter(vendor_id=user.id)
    if start and end:
        ledger = ledger.filter(created_at__date__gte=start, created_at__date__lte=end)

    sales = ledger.filter(entry_type=LedgerEntryType.SALE).aggregate(t=Sum("amount"))["t"] or 0
    fees = abs(
        ledger.filter(
            entry_type__in=[
                LedgerEntryType.COMMISSION,
                LedgerEntryType.PROCESSING,
                LedgerEntryType.LISTING_FEE,
                LedgerEntryType.SUBSCRIPTION,
                LedgerEntryType.SETUP_FEE,
            ]
        ).aggregate(t=Sum("amount"))["t"]
        or 0
    )
    books = ExpenseBill.objects.filter(owner_id=user.id, is_platform=False)
    if start and end:
        books = books.filter(issued_at__gte=start, issued_at__lte=end)
    expenses = (
        books.filter(
            kind__in=[ExpenseKind.EXPENSE, ExpenseKind.BILL],
            status__in=[ExpenseStatus.POSTED, ExpenseStatus.PAID],
        ).aggregate(t=Sum("amount"))["t"]
        or 0
    )
    other_income = (
        books.filter(
            kind=ExpenseKind.INCOME,
            status__in=[ExpenseStatus.POSTED, ExpenseStatus.PAID],
        ).aggregate(t=Sum("amount"))["t"]
        or 0
    )
    balance = vendor_available_balance(user.id)

    # Last 6 calendar months for a simple P&L strip
    monthly = []
    today = date.today()
    for i in range(5, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        m_start, m_end = _period_bounds(y, m)
        m_ledger = VendorLedgerEntry.objects.filter(
            vendor_id=user.id, created_at__date__gte=m_start, created_at__date__lte=m_end
        )
        m_sales = m_ledger.filter(entry_type=LedgerEntryType.SALE).aggregate(t=Sum("amount"))["t"] or 0
        m_fees = abs(
            m_ledger.filter(
                entry_type__in=[
                    LedgerEntryType.COMMISSION,
                    LedgerEntryType.PROCESSING,
                    LedgerEntryType.LISTING_FEE,
                    LedgerEntryType.SUBSCRIPTION,
                    LedgerEntryType.SETUP_FEE,
                ]
            ).aggregate(t=Sum("amount"))["t"]
            or 0
        )
        m_books = ExpenseBill.objects.filter(
            owner_id=user.id, is_platform=False, issued_at__gte=m_start, issued_at__lte=m_end
        )
        m_exp = (
            m_books.filter(
                kind__in=[ExpenseKind.EXPENSE, ExpenseKind.BILL],
                status__in=[ExpenseStatus.POSTED, ExpenseStatus.PAID],
            ).aggregate(t=Sum("amount"))["t"]
            or 0
        )
        m_inc = (
            m_books.filter(
                kind=ExpenseKind.INCOME,
                status__in=[ExpenseStatus.POSTED, ExpenseStatus.PAID],
            ).aggregate(t=Sum("amount"))["t"]
            or 0
        )
        monthly.append(
            {
                "year": y,
                "month": m,
                "label": f"{y}-{m:02d}",
                "gross_sales": float(m_sales),
                "platform_fees_total": float(m_fees),
                "operating_expenses": float(m_exp),
                "other_income": float(m_inc),
                "estimated_net": float(m_sales) - float(m_fees) + float(m_inc) - float(m_exp),
            }
        )

    return Response(
        {
            "year": year,
            "month": month,
            "gross_sales": float(sales),
            "platform_fees_total": float(fees),
            "other_income": float(other_income),
            "operating_expenses": float(expenses),
            "available_balance": float(balance),
            "estimated_net": float(sales) - float(fees) + float(other_income) - float(expenses),
            "months": monthly,
        }
    )


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES, UserRole.ADMIN, UserRole.SUPER_ADMIN)
def expense_pdf(request, expense_id):
    """Download expense / income voucher PDF for a book entry."""
    from shop.services.documents import build_voucher_pdf
    from shop.services.invoicing import seller_snapshot

    bill = ExpenseBill.objects.filter(id=expense_id).first()
    if not bill:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    user = request.user
    is_admin = user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
    if not is_admin and bill.owner_id != user.id:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
    if bill.is_platform and not is_admin:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    kind = "income_voucher" if bill.kind == ExpenseKind.INCOME else "expense_voucher"
    platform = seller_snapshot()
    if bill.is_platform:
        issuer_name = platform["name"]
    else:
        profile_name = getattr(getattr(user, "profile", None), "full_name", None)
        issuer_name = profile_name or getattr(user, "email", None) or "Seller"
    pdf_bytes = build_voucher_pdf(
        kind=kind,
        number=bill.number,
        issued_at=bill.issued_at,
        currency=bill.currency,
        status=bill.status,
        issuer_name=issuer_name,
        party_name=bill.counterparty or "—",
        amount=bill.amount,
        narration=f"{bill.title} ({bill.category})",
        reference=bill.number,
    )
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{bill.number}.pdf"'
    return response


@api_view(["GET"])
@permission_classes([AllowAny])
def public_seller_fees(request):
    """Public fee guide for Sell on Kedi Smart (Daraz-style transparency)."""
    from shop.models import CommissionPlan, ProductCategory

    plans = []
    for p in CommissionPlan.objects.filter(is_active=True).order_by("commission_percent", "slug"):
        plans.append(
            {
                "slug": p.slug,
                "name": p.name,
                "description": p.description or "",
                "commission_percent": float(p.commission_percent),
                "listing_fee": float(p.listing_fee),
                "setup_fee": float(p.setup_fee),
                "subscription_monthly_fee": float(p.subscription_monthly_fee),
                "is_default": p.is_default,
            }
        )
    categories = (
        ProductCategory.objects.exclude(commission_percent__isnull=True)
        .order_by("name")
        .values("name", "slug", "commission_percent")[:40]
    )
    return Response(
        {
            "hold_days": PAYOUT_HOLD_DAYS,
            "highlights": [
                "Free to list shop products on Standard",
                "Commission by category (food usually lower)",
                f"Withdraw {PAYOUT_HOLD_DAYS} days after delivery",
                "No setup fee on Standard seller plan",
            ],
            "plans": plans,
            "category_rates": [
                {
                    "name": c["name"],
                    "slug": c["slug"],
                    "commission_percent": float(c["commission_percent"]),
                }
                for c in categories
            ],
        }
    )
