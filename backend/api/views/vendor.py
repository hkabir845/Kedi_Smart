from decimal import Decimal

from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response

from accounts.models import UserRole, VendorProfile, VerificationRequest, VerificationStatus, VerificationType
from api.authentication import JWTAuthentication, require_roles
from api.utils import slugify
from api.views import serialize_model, serialize_models
from shop.models import OrderItem, Product, ProductApprovalStatus, ProductSourceType, VendorLedgerEntry, VendorPayout
from shop.services.commission import get_default_commission_plan


def _serialize_vendor_product(product):
    from api.views.shop import _serialize_product_list_item

    return _serialize_product_list_item(product)


@api_view(["GET", "POST", "PUT"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_profile(request):
    user = request.user

    if request.method == "GET":
        profile = VendorProfile.objects.filter(user_id=user.id).first()
        if not profile:
            return Response({"detail": "Vendor profile not found"}, status=status.HTTP_404_NOT_FOUND)
        data = serialize_model(profile)
        data["commission_plan"] = (
            serialize_model(profile.commission_plan) if profile.commission_plan_id else None
        )
        return Response(data)

    data = request.data
    shop_name = data.get("shop_name")
    shop_slug = data.get("shop_slug") or slugify(shop_name or "")

    if not shop_name:
        return Response({"detail": "shop_name is required"}, status=status.HTTP_400_BAD_REQUEST)

    profile = VendorProfile.objects.filter(user_id=user.id).first()
    if profile:
        profile.shop_name = shop_name
        profile.shop_slug = shop_slug
        if "description" in data:
            profile.description = data["description"]
        if "payout_method" in data:
            profile.payout_method = data["payout_method"]
        if "payout_details" in data:
            profile.payout_details = data["payout_details"]
        profile.save()
    else:
        plan = get_default_commission_plan()
        profile = VendorProfile.objects.create(
            user=user,
            shop_name=shop_name,
            shop_slug=shop_slug,
            description=data.get("description"),
            commission_plan=plan,
            payout_method=data.get("payout_method", "bank_transfer"),
            payout_details=data.get("payout_details") or {},
            is_active=True,
            is_approved=False,
        )
        VerificationRequest.objects.get_or_create(
            user=user,
            type=VerificationType.VENDOR,
            status=VerificationStatus.PENDING,
            defaults={"docs_urls": data.get("docs_urls") or []},
        )

    return Response(serialize_model(profile), status=status.HTTP_201_CREATED if request.method == "POST" else status.HTTP_200_OK)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_products(request):
    user = request.user
    products = Product.objects.filter(
        vendor_id=user.id, source_type=ProductSourceType.VENDOR
    ).order_by("-created_at")
    return Response([_serialize_vendor_product(p) for p in products])


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_orders(request):
    user = request.user
    items = (
        OrderItem.objects.filter(vendor_id=user.id)
        .select_related("order", "variant")
        .order_by("-created_at")
    )

    results = []
    for item in items:
        row = serialize_model(item)
        row["order"] = serialize_model(item.order) if item.order_id else None
        results.append(row)

    return Response(results)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_earnings(request):
    user = request.user
    sales = OrderItem.objects.filter(vendor_id=user.id).aggregate(
        gross=Sum("line_subtotal"),
        fees=Sum("platform_fee"),
        earnings=Sum("vendor_earnings"),
    )
    ledger_balance = VendorLedgerEntry.objects.filter(vendor_id=user.id).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    paid_out = VendorPayout.objects.filter(vendor_id=user.id, status="paid").aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    pending_payout = VendorPayout.objects.filter(vendor_id=user.id, status="pending").aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")

    return Response(
        {
            "gross_sales": float(sales["gross"] or 0),
            "platform_fees": float(sales["fees"] or 0),
            "net_earnings": float(sales["earnings"] or 0),
            "ledger_balance": float(ledger_balance),
            "paid_out": float(paid_out),
            "pending_payout": float(pending_payout),
        }
    )


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def my_verifications(request):
    user = request.user
    requests = VerificationRequest.objects.filter(user_id=user.id).order_by("-created_at")
    return Response(serialize_models(requests))


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.OWNER, UserRole.VENDOR, UserRole.BREEDER, UserRole.TRADER, UserRole.SHELTER, UserRole.VET)
def submit_verification(request):
    user = request.user
    data = request.data
    vtype = data.get("type")
    if vtype not in [t.value for t in VerificationType]:
        return Response({"detail": "Invalid verification type"}, status=status.HTTP_400_BAD_REQUEST)

    existing = VerificationRequest.objects.filter(
        user_id=user.id, type=vtype, status=VerificationStatus.PENDING
    ).first()
    if existing:
        return Response(serialize_model(existing))

    req = VerificationRequest.objects.create(
        user_id=user.id,
        type=vtype,
        docs_urls=data.get("docs_urls") or [],
        status=VerificationStatus.PENDING,
    )
    return Response(serialize_model(req), status=status.HTTP_201_CREATED)
