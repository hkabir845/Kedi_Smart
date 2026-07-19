from decimal import Decimal

from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response

from accounts.models import UserRole, VendorProfile, VerificationRequest, VerificationStatus, VerificationType
from api.authentication import JWTAuthentication, require_roles
from api.utils import slugify
from api.views import serialize_model, serialize_models
from shop.models import (
    Order,
    OrderItem,
    Product,
    ProductApprovalStatus,
    ProductSourceType,
    VendorLedgerEntry,
    VendorPayout,
)
from shop.services.commission import get_default_commission_plan
from shop.services.invoicing import ensure_documents_for_order

SELLER_MONEY_ROLES = (
    UserRole.VENDOR,
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
)


def _serialize_vendor_product(product):
    from api.views.shop import _serialize_product_list_item
    from shop.services.inventory import tracks_inventory

    data = _serialize_product_list_item(product, for_buyer=False)
    data["product_kind"] = product.product_kind
    data["track_inventory"] = product.track_inventory
    enriched = []
    for variant in product.variants.all():
        row = serialize_model(variant)
        row["tracks_inventory"] = tracks_inventory(variant)
        row["is_low_stock"] = bool(
            product.track_inventory and variant.stock_qty <= variant.low_stock_threshold
        )
        enriched.append(row)
    data["variants"] = enriched
    data["is_low_stock"] = any(v.get("is_low_stock") for v in enriched)
    return data


def _serialize_vendor_order(order: Order, vendor_user_id: int):
    from api.views.shop import _serialize_order
    from shop.services.couriers import list_couriers
    from shop.services.fulfillment import ensure_shipments_for_order, serialize_shipment

    ensure_documents_for_order(order)
    ensure_shipments_for_order(order)
    data = _serialize_order(order, include_items=True, include_docs=True, for_buyer=False)
    vendor_items = OrderItem.objects.filter(order_id=order.id, vendor_id=vendor_user_id)
    data["items"] = serialize_models(vendor_items)
    data["vendor_scope"] = True
    data["document_role"] = "fulfillment"
    from shop.models import Shipment

    shipment = Shipment.objects.filter(order_id=order.id, vendor_id=vendor_user_id).first()
    data["shipment"] = serialize_shipment(shipment) if shipment else None
    data["couriers"] = list_couriers()
    return data


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
        if "logo_url" in data:
            profile.logo_url = (data.get("logo_url") or "").strip() or None
        profile.save()
    else:
        plan = get_default_commission_plan()
        profile = VendorProfile.objects.create(
            user=user,
            shop_name=shop_name,
            shop_slug=shop_slug,
            description=data.get("description"),
            logo_url=(data.get("logo_url") or "").strip() or None,
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


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_logo_upload(request):
    """Upload / replace the vendor shop logo."""
    from config.media_images import process_image

    user = request.user
    profile = VendorProfile.objects.filter(user_id=user.id).first()
    if not profile:
        return Response(
            {"detail": "Create a vendor profile first"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"detail": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

    content_type = getattr(uploaded, "content_type", "") or ""
    if not content_type.startswith("image/"):
        return Response({"detail": "Please upload an image file"}, status=status.HTTP_400_BAD_REQUEST)

    max_bytes = 8 * 1024 * 1024
    if uploaded.size and uploaded.size > max_bytes:
        return Response({"detail": "Image must be under 8 MB"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        _file, media_url = process_image(uploaded, subdir="logos", mode="contain")
    except Exception:
        return Response({"detail": "Could not process image"}, status=status.HTTP_400_BAD_REQUEST)

    profile.logo_url = media_url
    profile.save(update_fields=["logo_url", "updated_at"])
    return Response({"logo_url": media_url, "profile": serialize_model(profile)})


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_product_image_upload(request):
    """Upload a product image for listing create/edit (returns media URL)."""
    from config.media_images import process_image

    user = request.user
    profile = VendorProfile.objects.filter(user_id=user.id).first()
    if not profile:
        return Response(
            {"detail": "Create a vendor profile first"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not profile.is_active:
        return Response({"detail": "Vendor account is inactive"}, status=status.HTTP_403_FORBIDDEN)

    uploaded = request.FILES.get("file")
    if not uploaded:
        return Response({"detail": "file is required"}, status=status.HTTP_400_BAD_REQUEST)

    content_type = getattr(uploaded, "content_type", "") or ""
    if not content_type.startswith("image/"):
        return Response({"detail": "Please upload an image file"}, status=status.HTTP_400_BAD_REQUEST)

    max_bytes = 8 * 1024 * 1024
    if uploaded.size and uploaded.size > max_bytes:
        return Response({"detail": "Image must be under 8 MB"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        _file, media_url = process_image(uploaded, subdir="products", mode="square")
    except Exception:
        return Response({"detail": "Could not process image"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"image_url": media_url, "url": media_url})


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_products(request):
    user = request.user
    qs = Product.objects.filter(
        vendor_id=user.id, source_type=ProductSourceType.VENDOR
    ).order_by("-created_at")
    results = [_serialize_vendor_product(p) for p in qs]
    if request.query_params.get("low_stock") in ("1", "true", "yes"):
        results = [p for p in results if p.get("is_low_stock") and p.get("track_inventory")]
    return Response(results)


@api_view(["GET", "PUT"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_product_detail(request, product_id: int):
    from decimal import Decimal

    from shop.models import ProductKind, ProductVariant
    from shop.services.inventory import set_stock

    user = request.user
    product = Product.objects.filter(
        id=product_id, vendor_id=user.id, source_type=ProductSourceType.VENDOR
    ).first()
    if not product:
        return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_vendor_product(product))

    data = request.data or {}
    update_fields = []
    for field in ("title", "description_md", "brand", "status"):
        if field in data and data[field] is not None:
            setattr(product, field, data[field])
            update_fields.append(field)

    if "product_kind" in data:
        kind = str(data.get("product_kind") or ProductKind.PHYSICAL).strip()
        if kind in {c.value for c in ProductKind}:
            product.product_kind = kind
            product.sync_inventory_flags()
            update_fields.extend(["product_kind", "track_inventory", "is_digital"])

    if "track_inventory" in data and product.product_kind == ProductKind.PHYSICAL:
        product.track_inventory = bool(data.get("track_inventory"))
        update_fields.append("track_inventory")

    if update_fields:
        product.save(update_fields=[*set(update_fields), "updated_at"])

    variant = ProductVariant.objects.filter(product_id=product.id).order_by("id").first()
    if variant:
        v_fields = []
        if "price" in data and data["price"] is not None:
            variant.price = Decimal(str(data["price"]))
            v_fields.append("price")
        if "compare_at_price" in data:
            raw = data.get("compare_at_price")
            variant.compare_at_price = Decimal(str(raw)) if raw not in (None, "") else None
            v_fields.append("compare_at_price")
        if "low_stock_threshold" in data and data["low_stock_threshold"] is not None:
            variant.low_stock_threshold = max(0, int(data["low_stock_threshold"]))
            v_fields.append("low_stock_threshold")
        if "sku" in data and data["sku"]:
            variant.sku = str(data["sku"])[:100]
            v_fields.append("sku")
        if v_fields:
            variant.save(update_fields=[*v_fields, "updated_at"])
        if "stock_qty" in data and data["stock_qty"] is not None and product.track_inventory:
            set_stock(
                variant,
                quantity=int(data["stock_qty"]),
                actor=user,
                note="Updated from product editor",
            )

    return Response(_serialize_vendor_product(product))


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_stock_adjust(request, product_id: int):
    from shop.models import InventoryMovementReason, ProductVariant
    from shop.services.inventory import InsufficientStockError, adjust_stock, set_stock

    user = request.user
    product = Product.objects.filter(
        id=product_id, vendor_id=user.id, source_type=ProductSourceType.VENDOR
    ).first()
    if not product:
        return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
    if not product.track_inventory:
        return Response(
            {"detail": "This listing does not track inventory (service/digital)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    variant_id = request.data.get("variant_id")
    qs = ProductVariant.objects.filter(product_id=product.id)
    variant = qs.filter(id=variant_id).first() if variant_id else qs.order_by("id").first()
    if not variant:
        return Response({"detail": "Variant not found"}, status=status.HTTP_404_NOT_FOUND)

    reason = (request.data.get("reason") or InventoryMovementReason.ADJUSTMENT).strip()
    if reason not in {c.value for c in InventoryMovementReason}:
        reason = InventoryMovementReason.ADJUSTMENT
    note = (request.data.get("note") or "")[:255]

    try:
        if "quantity" in request.data and request.data.get("quantity") is not None:
            variant = set_stock(
                variant,
                quantity=int(request.data["quantity"]),
                actor=user,
                note=note or "Set absolute quantity",
                reason=reason,
            )
        else:
            delta = int(request.data.get("delta") or 0)
            if delta == 0:
                return Response(
                    {"detail": "delta or quantity is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if delta > 0 and reason == InventoryMovementReason.ADJUSTMENT:
                reason = InventoryMovementReason.RESTOCK
            variant = adjust_stock(
                variant, delta=delta, reason=reason, actor=user, note=note
            )
    except InsufficientStockError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "product": _serialize_vendor_product(product),
            "variant_id": variant.id,
            "stock_qty": variant.stock_qty,
        }
    )


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_inventory_movements(request, product_id: int):
    from shop.models import InventoryMovement, ProductVariant

    user = request.user
    product = Product.objects.filter(
        id=product_id, vendor_id=user.id, source_type=ProductSourceType.VENDOR
    ).first()
    if not product:
        return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
    variant_ids = list(
        ProductVariant.objects.filter(product_id=product.id).values_list("id", flat=True)
    )
    rows = InventoryMovement.objects.filter(variant_id__in=variant_ids).order_by("-created_at")[:50]
    return Response(serialize_models(rows))


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_orders(request):
    from shop.models import Invoice

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
        inv = Invoice.objects.filter(order_id=item.order_id).first() if item.order_id else None
        row["invoice_number"] = inv.number if inv else None
        results.append(row)

    return Response(results)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_order_detail(request, order_id: int):
    """Shared fulfillment invoice for a customer order that includes this vendor's items."""
    user = request.user
    has_items = OrderItem.objects.filter(order_id=order_id, vendor_id=user.id).exists()
    if not has_items:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_vendor_order(order, user.id))


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_MONEY_ROLES)
def vendor_earnings(request):
    from shop.services.payouts import PAYOUT_HOLD_DAYS, vendor_balance_breakdown

    user = request.user
    sales = OrderItem.objects.filter(vendor_id=user.id).aggregate(
        gross=Sum("line_subtotal"),
        fees=Sum("platform_fee"),
        processing=Sum("payment_processing_fee"),
        earnings=Sum("vendor_earnings"),
    )
    paid_out = VendorPayout.objects.filter(vendor_id=user.id, status="paid").aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    balances = vendor_balance_breakdown(user.id)

    recent = (
        VendorLedgerEntry.objects.filter(vendor_id=user.id)
        .select_related("order_item")
        .order_by("-created_at")[:40]
    )
    ledger_rows = []
    for entry in recent:
        row = serialize_model(entry)
        if entry.order_item_id:
            row["title"] = entry.order_item.title_snapshot
            row["order_id"] = entry.order_item.order_id
        ledger_rows.append(row)

    payouts = VendorPayout.objects.filter(vendor_id=user.id).order_by("-created_at")[:20]
    payout_hint = (
        "Add bank / mobile wallet details in your profile before requesting payout."
        if user.role == UserRole.VENDOR
        else "Add payout details under Seller account before requesting payout."
    )

    you_keep = float(sales["earnings"] or 0)
    platform_took = float(sales["fees"] or 0) + float(sales["processing"] or 0)

    return Response(
        {
            "gross_sales": float(sales["gross"] or 0),
            "platform_fees": float(sales["fees"] or 0),
            "processing_fees": float(sales["processing"] or 0),
            "net_earnings": you_keep,
            "platform_took": platform_took,
            "ledger_balance": float(balances["ledger_balance"]),
            "held_for_clearance": float(balances["held_for_clearance"]),
            "available_for_payout": float(balances["available_for_payout"]),
            "paid_out": float(paid_out),
            "pending_payout": float(balances["pending_payout"]),
            "hold_days": PAYOUT_HOLD_DAYS,
            "ledger": ledger_rows,
            "payouts": serialize_models(payouts),
            "payout_note": (
                f"You keep sale amount minus Kedi Smart commission (by category) and a small "
                f"payment fee. Funds become withdrawable {PAYOUT_HOLD_DAYS} days after delivery. "
                f"{payout_hint}"
            ),
            "fee_explainer": (
                "Like Daraz: free to list shop products. Commission depends on category "
                "(food usually lower, accessories a bit higher). Vet/manual invoices use the "
                "services rate."
            ),
        }
    )


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_MONEY_ROLES)
def vendor_payouts(request):
    from shop.services.notify import notify_vendor_payout_requested
    from shop.services.payouts import PayoutError, request_vendor_payout

    user = request.user
    if request.method == "GET":
        rows = VendorPayout.objects.filter(vendor_id=user.id).order_by("-created_at")[:50]
        return Response(serialize_models(rows))

    amount = request.data.get("amount")
    try:
        payout = request_vendor_payout(
            user,
            amount=Decimal(str(amount)) if amount not in (None, "") else None,
            note=request.data.get("note") or "",
        )
    except PayoutError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    notify_vendor_payout_requested(user.id, payout.amount, payout.id)
    return Response(serialize_model(payout), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "POST"])
@authentication_classes([JWTAuthentication])
@require_roles(UserRole.VENDOR)
def vendor_order_shipment(request, order_id: int):
    """Get / update this vendor's shipment for a multi-seller order."""
    from shop.models import Shipment
    from shop.services.couriers import CourierError, list_couriers
    from shop.services.fulfillment import (
        book_courier,
        ensure_shipments_for_order,
        serialize_shipment,
        update_shipment,
    )

    user = request.user
    if not OrderItem.objects.filter(order_id=order_id, vendor_id=user.id).exists():
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    ensure_shipments_for_order(order)
    shipment = Shipment.objects.filter(order_id=order_id, vendor_id=user.id).first()
    if not shipment:
        return Response({"detail": "Shipment not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({"shipment": serialize_shipment(shipment), "couriers": list_couriers()})

    if request.method == "POST":
        # Book courier / create consignment
        provider = (request.data.get("courier") or shipment.courier or "manual").strip()
        try:
            shipment = book_courier(shipment, provider=provider)
        except (CourierError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serialize_shipment(shipment))

    try:
        shipment = update_shipment(
            shipment,
            status=request.data.get("status"),
            courier=request.data.get("courier"),
            tracking_number=request.data.get("tracking_number"),
            tracking_url=request.data.get("tracking_url"),
            consignment_id=request.data.get("consignment_id"),
            carrier_note=request.data.get("carrier_note"),
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(serialize_shipment(shipment))


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_MONEY_ROLES)
def vendor_statements(request):
    from shop.services.statements import build_vendor_statement, list_vendor_statements

    user = request.user
    year = request.query_params.get("year")
    month = request.query_params.get("month")
    if year and month:
        try:
            data = build_vendor_statement(user.id, year=int(year), month=int(month), persist=True)
        except ValueError:
            return Response({"detail": "Invalid year/month"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data)
    return Response({"items": list_vendor_statements(user.id)})


@api_view(["GET", "PATCH"])
@authentication_classes([JWTAuthentication])
@require_roles(
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
)
def seller_account(request):
    """Payout + commission account for vets and live-animal sellers."""
    from accounts.services.sellers import ensure_seller_account

    user = request.user
    account = ensure_seller_account(user, approved=False)
    if not account:
        return Response({"detail": "Seller account not available for this role"}, status=status.HTTP_403_FORBIDDEN)

    if request.method == "PATCH":
        data = request.data or {}
        if "display_name" in data and data["display_name"]:
            account.display_name = str(data["display_name"]).strip()[:255]
        if "payout_method" in data and data["payout_method"]:
            account.payout_method = str(data["payout_method"]).strip()[:50]
        if "payout_details" in data and isinstance(data["payout_details"], dict):
            account.payout_details = data["payout_details"]
        account.save()

    row = serialize_model(account)
    row["commission_plan"] = (
        serialize_model(account.commission_plan) if account.commission_plan_id else None
    )
    return Response(row)


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
