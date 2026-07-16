from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import User, UserProfile, UserRole, VendorProfile
from api.authentication import JWTAuthentication, OptionalJWTAuthentication, get_current_user, require_roles
from api.security import get_password_hash, validate_password_strength, verify_password
from api.views.auth import _issue_tokens
from api.utils import unique_slug
from api.views import paginate_queryset, serialize_model, serialize_models
from shop.models import (
    Cart,
    CartItem,
    FulfillmentType,
    Invoice,
    Order,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Product,
    ProductApprovalStatus,
    ProductCatalog,
    ProductCategory,
    ProductImage,
    ProductKind,
    ProductReview,
    ProductSourceType,
    ProductStatus,
    ProductVariant,
    ProductVideo,
    Receipt,
    ShippingAddress,
)
from shop.services.commission import (
    calculate_line_fees,
    platform_product_defaults,
    vendor_product_defaults,
)
from shop.services.inventory import (
    InsufficientStockError,
    assert_cart_stock,
    consume_stock_for_sale,
    expire_reservations,
    release_cart_reservation,
    reserve_cart_qty,
    reserve_ttl_minutes,
    touch_cart_reservations,
    tracks_inventory,
)
from shop.services.invoicing import (
    compute_order_totals,
    create_invoice_and_receipt,
    fulfillment_for_method,
    make_track_token,
    order_timeline,
    payment_instructions,
    phones_match,
    resolve_payment_method,
    seller_snapshot,
    WALLET_METHODS,
)
from shop.services.coupons import CouponError, record_coupon_use, validate_coupon
from shop.services.notify import notify_order_placed
from django.utils import timezone
from datetime import timedelta
from siteplatform.models import ModerationQueue, ModerationStatus


def _serialize_cart_item(item):
    data = serialize_model(item)
    if item.variant_id:
        variant = item.variant
        variant_data = serialize_model(variant)
        product = Product.objects.filter(id=variant.product_id).first()
        if product:
            variant_data["product"] = {
                "id": product.id,
                "title": product.title,
                "slug": product.slug,
                "brand": product.brand,
            }
        data["variant"] = variant_data
    return data


def _serialize_document(doc):
    if not doc:
        return None
    data = serialize_model(doc)
    return data


def _serialize_order(order, include_items=False, include_docs=False, *, for_buyer: bool = True):
    data = serialize_model(order)
    data["public_order_number"] = order.public_order_number
    if include_items or include_docs:
        items = OrderItem.objects.filter(order_id=order.id)
        serialized_items = serialize_models(items)
        if for_buyer:
            for row in serialized_items:
                row.pop("vendor_user_id", None)
                row.pop("commission_rate", None)
                row.pop("platform_fee", None)
                row.pop("payment_processing_fee", None)
                row.pop("vendor_earnings", None)
                row.pop("platform_revenue", None)
                row.pop("source_type", None)
        data["items"] = serialized_items
        shipping = ShippingAddress.objects.filter(order_id=order.id).first()
        data["shipping_address"] = serialize_model(shipping) if shipping else None
        payment = Payment.objects.filter(order_id=order.id).order_by("id").first()
        data["payment"] = serialize_model(payment) if payment else None
        if payment:
            data["payment_instructions"] = payment_instructions(payment.method)
        data["timeline"] = order_timeline(order)
        data["seller"] = seller_snapshot()
        data["invoice"] = _serialize_document(Invoice.objects.filter(order_id=order.id).first())
        data["receipt"] = _serialize_document(Receipt.objects.filter(order_id=order.id).first())
        from shop.models import Shipment
        from shop.services.fulfillment import serialize_shipment

        data["shipments"] = [
            serialize_shipment(s) for s in Shipment.objects.filter(order_id=order.id).order_by("id")
        ]
        if for_buyer:
            data["sold_by"] = "Kedi Smart"
    return data


def _serialize_variant(variant):
    data = serialize_model(variant)
    return data


def _serialize_product_list_item(product, *, for_buyer: bool = True):
    variants = ProductVariant.objects.filter(product_id=product.id, is_active=True)
    images = ProductImage.objects.filter(product_id=product.id).order_by("sort_order")
    reviews = ProductReview.objects.filter(product_id=product.id)
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else None

    item_dict = serialize_model(product)
    item_dict["variants"] = [_serialize_variant(v) for v in variants]
    item_dict["images"] = serialize_models(images)

    category = None
    if product.category_id:
        cat = ProductCategory.objects.filter(id=product.category_id).first()
        if cat:
            category = {"id": cat.id, "name": cat.name, "slug": cat.slug}
    item_dict["category"] = category
    item_dict["average_rating"] = round(avg_rating, 2) if avg_rating else None

    if for_buyer:
        # Amazon white-label: shoppers buy from Kedi Smart — hide merchant IDs
        item_dict.pop("vendor_user_id", None)
        item_dict.pop("source_type", None)
        item_dict.pop("approval_status", None)
        item_dict.pop("listing_fee_paid", None)
        item_dict["sold_by"] = "Kedi Smart"

    return item_dict


def _get_cart_for_request(request):
    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    session_id = request.query_params.get("session_id") or request.data.get("session_id")

    if current_user:
        return Cart.objects.filter(user_id=current_user.id).first(), current_user, session_id
    if session_id:
        return Cart.objects.filter(session_id=session_id).first(), None, session_id
    return None, None, None


def _merge_guest_cart_into_user(session_id: str, user_id: int) -> Cart:
    user_cart, _ = Cart.objects.get_or_create(user_id=user_id)
    guest_cart = Cart.objects.filter(session_id=session_id).first()
    if not guest_cart or guest_cart.id == user_cart.id:
        return user_cart

    for item in CartItem.objects.filter(cart_id=guest_cart.id):
        existing = CartItem.objects.filter(cart_id=user_cart.id, variant_id=item.variant_id).first()
        if existing:
            existing.qty += item.qty
            existing.save(update_fields=["qty"])
        else:
            CartItem.objects.create(cart_id=user_cart.id, variant_id=item.variant_id, qty=item.qty)

    CartItem.objects.filter(cart_id=guest_cart.id).delete()
    guest_cart.delete()
    return user_cart


def _sync_profile_from_shipping(user: User, shipping_data: dict) -> None:
    profile = UserProfile.objects.filter(user_id=user.id).first()
    if not profile:
        return
    profile.full_name = shipping_data.get("name") or profile.full_name
    profile.phone = shipping_data.get("phone") or profile.phone
    profile.address = shipping_data.get("address") or profile.address
    profile.city = shipping_data.get("city") or profile.city
    profile.country = shipping_data.get("country") or profile.country or "Bangladesh"
    profile.save(
        update_fields=["full_name", "phone", "address", "city", "country"]
    )


@api_view(["GET"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def list_categories(request):
    catalog = request.query_params.get("catalog")
    queryset = ProductCategory.objects.all()
    if catalog in ("pet_animal", "general"):
        queryset = queryset.filter(catalog=catalog)
    return Response(serialize_models(queryset))


@api_view(["GET", "POST"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def products(request):
    if request.method == "POST":
        auth = JWTAuthentication()
        result = auth.authenticate(request)
        if result is None:
            return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        request.user, _ = result
        if request.user.role not in (UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN):
            return Response({"detail": "Not enough permissions"}, status=status.HTTP_403_FORBIDDEN)
        return _create_product(request)
    return _list_products(request)


def _list_products(request):
    category_id = request.query_params.get("category_id")
    catalog = request.query_params.get("catalog")
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 20))

    queryset = Product.objects.filter(
        Q(status=ProductStatus.PUBLISHED) | Q(status="PUBLISHED")
    ).order_by("-created_at")
    if catalog in ("pet_animal", "general"):
        queryset = queryset.filter(catalog=catalog)
    queryset = queryset.exclude(
        source_type=ProductSourceType.VENDOR,
        approval_status=ProductApprovalStatus.PENDING,
    ).exclude(
        source_type=ProductSourceType.VENDOR,
        approval_status=ProductApprovalStatus.REJECTED,
    )
    if category_id:
        queryset = queryset.filter(category_id=category_id)

    page_num = (skip // limit) + 1 if limit > 0 else 1
    items, total, page, size, pages = paginate_queryset(queryset, page_num, limit)
    enhanced_items = [_serialize_product_list_item(item) for item in items]

    return Response(
        {
            "items": enhanced_items,
            "total": total,
            "page": page,
            "size": size,
            "pages": pages,
        }
    )


@api_view(["GET"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def get_product(request, slug):
    product = Product.objects.filter(slug=slug).first()
    if not product:
        return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    is_public = product.status == ProductStatus.PUBLISHED and not (
        product.source_type == ProductSourceType.VENDOR
        and product.approval_status
        in (ProductApprovalStatus.PENDING, ProductApprovalStatus.REJECTED)
    )
    user = getattr(request, "user", None)
    can_preview = bool(
        user
        and getattr(user, "is_authenticated", False)
        and (
            user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
            or product.vendor_id == user.id
        )
    )
    if not is_public and not can_preview:
        return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

    variants = ProductVariant.objects.filter(product_id=product.id, is_active=True)
    images = ProductImage.objects.filter(product_id=product.id).order_by("sort_order")
    videos = ProductVideo.objects.filter(product_id=product.id).order_by("sort_order")
    reviews = ProductReview.objects.filter(product_id=product.id).order_by("-created_at")[:10]

    ratings = ProductReview.objects.filter(product_id=product.id).values_list("rating", flat=True)
    ratings = list(ratings)
    avg_rating = sum(ratings) / len(ratings) if ratings else 0

    result = serialize_model(product)
    result["variants"] = serialize_models(variants)
    result["images"] = serialize_models(images)
    result["videos"] = serialize_models(videos)
    result["reviews"] = serialize_models(reviews)
    result["average_rating"] = round(avg_rating, 2) if avg_rating else None
    return Response(result)


def _create_product(request):
    user = request.user
    data = request.data

    if user.role == UserRole.VENDOR:
        profile = VendorProfile.objects.filter(user_id=user.id).first()
        if not profile:
            return Response(
                {"detail": "Create a vendor profile first at POST /vendor/profile"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not profile.is_active:
            return Response(
                {"detail": "Vendor account is inactive"},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Shop may still be pending approval — product goes to moderation queue.

    slug = unique_slug(Product, data["title"])

    if user.role == UserRole.VENDOR:
        defaults = vendor_product_defaults(user.id)
    else:
        source_type = data.get("source_type", ProductSourceType.PLATFORM_OWN)
        defaults = platform_product_defaults(source_type)

    catalog = data.get("catalog", ProductCatalog.PET_ANIMAL)
    if data.get("category_id"):
        cat = ProductCategory.objects.filter(id=data["category_id"]).first()
        if cat:
            catalog = cat.catalog

    product = Product.objects.create(
        category_id=data.get("category_id"),
        slug=slug,
        title=data["title"],
        description_md=data.get("description_md"),
        brand=data.get("brand"),
        catalog=catalog,
        is_digital=data.get("is_digital", False),
        is_nfc_tag_product=data.get("is_nfc_tag_product", False),
        status=data.get("status", defaults.get("status", "draft")),
        **defaults,
    )

    kind = (data.get("product_kind") or ProductKind.PHYSICAL).strip()
    if kind not in {c.value for c in ProductKind}:
        kind = ProductKind.PHYSICAL
    product.product_kind = kind
    if "track_inventory" in data:
        product.track_inventory = bool(data.get("track_inventory"))
    else:
        product.sync_inventory_flags()
    if product.product_kind == ProductKind.DIGITAL:
        product.is_digital = True
    product.save(
        update_fields=["product_kind", "track_inventory", "is_digital", "updated_at"]
    )

    price = data.get("price")
    if price is not None:
        sku = data.get("sku") or f"SKU-{product.id:04d}"
        if ProductVariant.objects.filter(sku=sku).exists():
            sku = f"{sku}-{int(datetime.now().timestamp())}"
        initial_stock = int(data.get("stock_qty", 0))
        if not product.track_inventory:
            initial_stock = 0
        variant = ProductVariant.objects.create(
            product=product,
            sku=sku,
            price=Decimal(str(price)),
            compare_at_price=Decimal(str(data["compare_at_price"])) if data.get("compare_at_price") else None,
            currency=data.get("currency", "BDT"),
            stock_qty=initial_stock,
            low_stock_threshold=int(data.get("low_stock_threshold", 5)),
            size=data.get("size"),
            flavor=data.get("flavor"),
            is_active=True,
        )
        if product.track_inventory and initial_stock > 0:
            from shop.models import InventoryMovement, InventoryMovementReason

            InventoryMovement.objects.create(
                variant=variant,
                delta=initial_stock,
                quantity_after=initial_stock,
                reason=InventoryMovementReason.INITIAL,
                note="Initial stock on create",
                actor=user,
            )

    image_url = (data.get("image_url") or "").strip()
    if image_url:
        ProductImage.objects.create(product=product, url=image_url[:500], sort_order=0)

    if user.role == UserRole.VENDOR:
        ModerationQueue.objects.get_or_create(
            entity_type="product",
            entity_id=product.id,
            status=ModerationStatus.PENDING,
        )

    result = _serialize_product_list_item(
        product, for_buyer=user.role not in (UserRole.VENDOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    )
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([OptionalJWTAuthentication])
def get_cart(request):
    cart, current_user, session_id = _get_cart_for_request(request)
    if not current_user and not session_id:
        return Response({"detail": "User or session_id required"}, status=status.HTTP_400_BAD_REQUEST)

    if not cart:
        return Response({"items": [], "subtotal": 0})

    expire_reservations(cart_id=cart.id)
    touch_cart_reservations(cart)
    items = CartItem.objects.filter(cart_id=cart.id).select_related("variant", "variant__product")
    subtotal = sum(item.qty * item.variant.price for item in items if item.variant)
    return Response(
        {
            "items": [_serialize_cart_item(item) for item in items],
            "subtotal": float(subtotal),
            "reserve_minutes": reserve_ttl_minutes(),
        }
    )


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
def add_to_cart(request):
    data = request.data
    variant_id = data.get("variant_id")
    try:
        qty = int(data.get("qty", 1))
    except (TypeError, ValueError):
        qty = 1
    if qty < 1:
        return Response({"detail": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)

    variant = ProductVariant.objects.select_related("product").filter(id=variant_id).first()
    if not variant or not variant.is_active:
        return Response({"detail": "Variant not found"}, status=status.HTTP_404_NOT_FOUND)

    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    session_id = data.get("session_id") or request.query_params.get("session_id")

    if current_user:
        cart, _ = Cart.objects.get_or_create(user_id=current_user.id)
    elif session_id:
        cart, _ = Cart.objects.get_or_create(session_id=session_id)
    else:
        return Response({"detail": "User or session_id required"}, status=status.HTTP_400_BAD_REQUEST)

    expire_reservations(cart_id=cart.id)
    existing_item = CartItem.objects.filter(cart_id=cart.id, variant_id=variant_id).first()
    previous_qty = existing_item.qty if existing_item else 0
    desired_qty = previous_qty + qty
    try:
        reserve_cart_qty(variant, new_qty=desired_qty, previous_qty=previous_qty)
    except InsufficientStockError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    until = timezone.now() + timedelta(minutes=reserve_ttl_minutes())
    if existing_item:
        existing_item.qty = desired_qty
        existing_item.reserved_until = until
        existing_item.save(update_fields=["qty", "reserved_until"])
    else:
        CartItem.objects.create(cart_id=cart.id, variant_id=variant_id, qty=qty, reserved_until=until)

    return Response({"message": "Item added to cart"}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@authentication_classes([OptionalJWTAuthentication])
def remove_cart_item(request, item_id):
    cart, current_user, session_id = _get_cart_for_request(request)
    if not current_user and not session_id:
        return Response({"detail": "User or session_id required"}, status=status.HTTP_400_BAD_REQUEST)
    if not cart:
        return Response({"detail": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)

    item = CartItem.objects.filter(id=item_id, cart_id=cart.id).select_related("variant", "variant__product").first()
    if not item:
        return Response({"detail": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND)
    if item.variant_id and item.reserved_until:
        release_cart_reservation(item.variant, item.qty)
    item.delete()
    return Response({"message": "Item removed"})


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
def checkout(request):
    data = request.data
    current_user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    session_id = data.get("session_id") or request.query_params.get("session_id")
    auth_tokens = None

    login_data = data.get("login")
    if not current_user and login_data:
        email = (login_data.get("email") or "").strip().lower()
        password = login_data.get("password") or ""
        user = User.objects.filter(email=email).first()
        if not user or not verify_password(password, user.password_hash):
            return Response(
                {"detail": "Incorrect email or password"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response({"detail": "Inactive user"}, status=status.HTTP_400_BAD_REQUEST)
        current_user = user
        if session_id:
            _merge_guest_cart_into_user(session_id, user.id)

    account = data.get("create_account")
    if not current_user and account:
        email = (account.get("email") or "").strip().lower()
        password = account.get("password") or ""
        full_name = (account.get("full_name") or account.get("name") or "").strip()
        phone = (account.get("phone") or "").strip()

        if not email or not password:
            return Response(
                {"detail": "Email and password are required to create an account"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        password_error = validate_password_strength(password)
        if password_error:
            return Response({"detail": password_error}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response(
                {"detail": "An account with this email already exists. Please sign in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        current_user = User.objects.create(
            email=email,
            password_hash=get_password_hash(password),
            role=UserRole.OWNER,
        )
        UserProfile.objects.create(
            user=current_user,
            full_name=full_name or email.split("@")[0],
            phone=phone or None,
        )
        auth_tokens = _issue_tokens(current_user)
        if session_id:
            _merge_guest_cart_into_user(session_id, current_user.id)

    if current_user:
        cart = Cart.objects.filter(user_id=current_user.id).first()
    elif session_id:
        cart = Cart.objects.filter(session_id=session_id).first()
    else:
        return Response({"detail": "User or session_id required"}, status=status.HTTP_400_BAD_REQUEST)

    if not cart:
        return Response({"detail": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)

    items = CartItem.objects.filter(cart_id=cart.id).select_related("variant", "variant__product")
    if not items:
        return Response({"detail": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        assert_cart_stock(items)
    except InsufficientStockError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    shipping_data = data.get("shipping_address") or {}
    if not current_user and not account and not login_data:
        return Response(
            {"detail": "Please sign in or create an account to complete checkout"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_method = resolve_payment_method(data.get("payment_method", "COD"))
    fulfillment_type = fulfillment_for_method(payment_method)
    if data.get("fulfillment_type") == FulfillmentType.STORE_PICKUP:
        fulfillment_type = FulfillmentType.STORE_PICKUP
        if payment_method not in (PaymentMethod.STORE_PICKUP, PaymentMethod.COD, PaymentMethod.BKASH, PaymentMethod.NAGAD):
            payment_method = PaymentMethod.STORE_PICKUP

    subtotal = sum((item.qty * item.variant.price for item in items if item.variant), Decimal("0.00"))
    try:
        coupon, discount = validate_coupon(data.get("coupon_code"), subtotal=subtotal)
    except CouponError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    totals = compute_order_totals(
        subtotal,
        fulfillment_type,
        discount=discount,
        city=(shipping_data.get("city") or "").strip() or None,
    )
    shipping_fee = totals["shipping_fee"]
    tax = totals["tax"]
    discount = totals["discount"]
    total = totals["total"]

    for required in ("name", "phone"):
        if not (shipping_data.get(required) or "").strip():
            return Response(
                {"detail": f"Shipping {required} is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    if fulfillment_type == FulfillmentType.DELIVERY:
        for required in ("address", "city"):
            if not (shipping_data.get(required) or "").strip():
                return Response(
                    {"detail": f"Shipping {required} is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    else:
        seller = seller_snapshot()
        shipping_data.setdefault("address", shipping_data.get("address") or seller["address"])
        shipping_data.setdefault("city", shipping_data.get("city") or "Dhaka")
        shipping_data.setdefault("country", shipping_data.get("country") or "Bangladesh")

    wallet_txn_id = (data.get("wallet_txn_id") or "").strip() or None
    wallet_phone = (data.get("wallet_phone") or shipping_data.get("phone") or "").strip() or None
    if payment_method in WALLET_METHODS and payment_method != PaymentMethod.MANUAL:
        # Txn ID optional at checkout — customer can add later via track page
        pass

    guest_email = None
    if not current_user:
        guest_email = (account or {}).get("email") or shipping_data.get("email")

    # Pre-validate publish/approval so we fail before mutating stock
    for item in items:
        if not item.variant:
            continue
        product = item.variant.product
        if product.status != "published":
            return Response(
                {"detail": f"Product not available for sale: {product.title}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            product.source_type == ProductSourceType.VENDOR
            and product.approval_status != ProductApprovalStatus.APPROVED
        ):
            return Response(
                {"detail": f"Vendor product pending approval: {product.title}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    try:
        with transaction.atomic():
            order = Order.objects.create(
                user_id=current_user.id if current_user else None,
                guest_email=guest_email,
                status=OrderStatus.PENDING,
                fulfillment_type=fulfillment_type,
                track_token=make_track_token(),
                subtotal=subtotal,
                discount=discount,
                coupon_code=coupon.code if coupon else None,
                shipping_fee=shipping_fee,
                tax=tax,
                total=total,
                currency="BDT",
            )

            for item in items:
                if not item.variant:
                    continue
                product = item.variant.product
                fees = calculate_line_fees(
                    unit_price=item.variant.price,
                    qty=item.qty,
                    product=product,
                    vendor_id=product.vendor_id,
                )
                order_item = OrderItem.objects.create(
                    order_id=order.id,
                    variant_id=item.variant_id,
                    vendor_id=fees["vendor_id"],
                    source_type=fees["source_type"],
                    title_snapshot=product.title,
                    price_snapshot=item.variant.price,
                    qty=item.qty,
                    line_subtotal=fees["line_subtotal"],
                    commission_rate=fees["commission_rate"],
                    platform_fee=fees["platform_fee"],
                    payment_processing_fee=fees["payment_processing_fee"],
                    vendor_earnings=fees["vendor_earnings"],
                    platform_revenue=fees["platform_revenue"],
                )
                release_reserved = (
                    item.qty
                    if item.reserved_until and item.reserved_until > timezone.now()
                    else 0
                )
                consume_stock_for_sale(
                    item.variant,
                    item.qty,
                    order=order,
                    order_item=order_item,
                    actor=current_user,
                    release_reserved=release_reserved,
                )

            ShippingAddress.objects.create(
                order_id=order.id,
                name=shipping_data["name"],
                phone=shipping_data["phone"],
                address=shipping_data.get("address") or "",
                city=shipping_data.get("city") or "Dhaka",
                country=shipping_data.get("country", "Bangladesh"),
                notes=shipping_data.get("notes"),
            )

            if current_user:
                _sync_profile_from_shipping(current_user, shipping_data)

            payment = Payment.objects.create(
                order_id=order.id,
                method=payment_method,
                status=PaymentStatus.PENDING,
                reference=wallet_txn_id,
                wallet_txn_id=wallet_txn_id,
                wallet_phone=wallet_phone,
                amount=total,
            )

            invoice, receipt = create_invoice_and_receipt(order, payment)
            record_coupon_use(coupon)

            CartItem.objects.filter(cart_id=cart.id).delete()
            cart.delete()
    except InsufficientStockError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        notify_order_placed(order)
    except Exception:
        pass

    order.refresh_from_db()
    response_data = _serialize_order(order, include_items=True, include_docs=True)
    response_data["track_token"] = order.track_token
    response_data["invoice_number"] = invoice.number
    response_data["receipt_number"] = receipt.number
    if auth_tokens:
        response_data["auth"] = auth_tokens

    if payment_method == PaymentMethod.SSLCOMMERZ:
        try:
            from shop.services.payments.sslcommerz import SSLCommerzError, initiate_payment

            customer_email = (
                (current_user.email if current_user else None)
                or guest_email
                or "noreply@kedismart.com"
            )
            gateway = initiate_payment(
                order=order,
                payment=payment,
                customer_name=shipping_data.get("name") or "Customer",
                customer_email=customer_email,
                customer_phone=shipping_data.get("phone") or "",
            )
            response_data["gateway_url"] = gateway["gateway_url"]
            response_data["payment_redirect"] = True
        except SSLCommerzError as exc:
            response_data["gateway_error"] = str(exc)

    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def list_orders(request):
    user = get_current_user(request)
    orders = Order.objects.filter(user_id=user.id).order_by("-created_at")
    return Response([_serialize_order(o, include_items=False) for o in orders])


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def get_order(request, order_id):
    user = get_current_user(request)
    order = Order.objects.filter(id=order_id, user_id=user.id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_order(order, include_items=True, include_docs=True))


@api_view(["GET", "POST"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def track_order(request):
    """Public order tracker — lookup by order id + phone, or track_token."""
    if request.method == "POST":
        payload = request.data
    else:
        payload = request.query_params

    token = (payload.get("token") or payload.get("track_token") or "").strip()
    order_id = payload.get("order_id") or payload.get("order")
    phone = (payload.get("phone") or "").strip()

    order = None
    if token:
        order = Order.objects.filter(track_token=token).first()
    elif order_id:
        try:
            oid = int(order_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid order id"}, status=status.HTTP_400_BAD_REQUEST)
        order = Order.objects.filter(id=oid).first()
        shipping = ShippingAddress.objects.filter(order_id=oid).first() if order else None
        if order and not phones_match(phone, shipping.phone if shipping else None):
            # Allow owner JWT without phone match
            user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
            if not (user and order.user_id == user.id):
                return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response(
            {"detail": "Provide order_id + phone, or track token"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(_serialize_order(order, include_items=True, include_docs=True))


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def submit_payment_reference(request, order_id):
    """Customer submits bKash/Nagad Txn ID while payment awaits approval."""
    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    phone = (request.data.get("phone") or "").strip()
    token = (request.data.get("token") or request.data.get("track_token") or "").strip()
    user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    allowed = False
    if token and order.track_token == token:
        allowed = True
    elif user and order.user_id == user.id:
        allowed = True
    shipping = ShippingAddress.objects.filter(order_id=order.id).first()
    if not allowed and phones_match(phone, shipping.phone if shipping else None):
        allowed = True
    if not allowed:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    payment = Payment.objects.filter(order_id=order.id).order_by("id").first()
    if not payment:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
    if payment.status == PaymentStatus.COMPLETED:
        return Response({"detail": "Payment already approved"}, status=status.HTTP_400_BAD_REQUEST)

    txn = (request.data.get("wallet_txn_id") or request.data.get("reference") or "").strip()
    if not txn:
        return Response({"detail": "wallet_txn_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    payment.wallet_txn_id = txn
    payment.reference = txn
    if request.data.get("wallet_phone"):
        payment.wallet_phone = request.data.get("wallet_phone")
    payment.save(update_fields=["wallet_txn_id", "reference", "wallet_phone", "updated_at"])
    return Response(_serialize_order(order, include_items=True, include_docs=True))


@api_view(["POST"])
@permission_classes([AllowAny])
def validate_coupon_code(request):
    subtotal = Decimal(str(request.data.get("subtotal") or 0))
    try:
        coupon, discount = validate_coupon(request.data.get("code") or request.data.get("coupon_code"), subtotal=subtotal)
    except CouponError as exc:
        return Response({"detail": str(exc), "valid": False}, status=status.HTTP_400_BAD_REQUEST)
    return Response(
        {
            "valid": True,
            "code": coupon.code if coupon else None,
            "type": coupon.type if coupon else None,
            "value": float(coupon.value) if coupon else 0,
            "discount": float(discount),
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def payment_options(request):
    """Public checkout payment methods + wallet numbers + shipping rules."""
    from shop.services.invoicing import commerce_rates, free_delivery_cities
    from shop.services.payments.sslcommerz import sslcommerz_enabled
    from siteplatform.services import get_setting_value

    methods = [
        {"value": "COD", "label": "Cash on Delivery", "fulfillment": "delivery"},
        {"value": "BKASH", "label": "bKash", "fulfillment": "delivery"},
        {"value": "NAGAD", "label": "Nagad", "fulfillment": "delivery"},
        {"value": "STORE_PICKUP", "label": "Store pickup", "fulfillment": "store_pickup"},
    ]
    if sslcommerz_enabled():
        methods.insert(1, {
            "value": "SSLCOMMERZ",
            "label": "Card / Mobile Banking",
            "fulfillment": "delivery",
        })
    rates = commerce_rates()
    return Response(
        {
            "methods": methods,
            "bkash_number": get_setting_value("commerce.bkash_number", "+880 1898-941782"),
            "nagad_number": get_setting_value("commerce.nagad_number", "+880 1898-941782"),
            "pickup_address": get_setting_value(
                "commerce.pickup_address",
                "A.B.M Tower, Gulshan 2, Dhaka 1212",
            ),
            "sslcommerz_enabled": sslcommerz_enabled(),
            "shipping": {
                "free_delivery_cities": sorted(free_delivery_cities()),
                "inside_city_shipping": float(rates["inside_city_shipping"]),
                "outside_city_shipping": float(rates["outside_city_shipping"]),
                "free_delivery_threshold": float(rates["free_delivery_threshold"]),
                "tax_rate": float(rates["tax_rate"]),
            },
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def shipping_quote(request):
    """Preview courier fee for checkout (city-aware)."""
    from shop.services.invoicing import compute_order_totals

    try:
        subtotal = Decimal(str(request.query_params.get("subtotal") or "0"))
    except Exception:
        subtotal = Decimal("0")
    try:
        discount = Decimal(str(request.query_params.get("discount") or "0"))
    except Exception:
        discount = Decimal("0")
    city = (request.query_params.get("city") or "").strip() or None
    fulfillment = (request.query_params.get("fulfillment") or "delivery").strip()
    if fulfillment not in (FulfillmentType.DELIVERY, FulfillmentType.STORE_PICKUP):
        fulfillment = FulfillmentType.DELIVERY
    totals = compute_order_totals(subtotal, fulfillment, discount=discount, city=city)
    return Response(
        {
            "shipping_fee": float(totals["shipping_fee"]),
            "tax": float(totals["tax"]),
            "discount": float(totals["discount"]),
            "total": float(totals["total"]),
            "shipping_note": totals.get("shipping_note"),
            "free_delivery_city": totals.get("free_delivery_city"),
            "message": _shipping_message(totals),
        }
    )


def _shipping_message(totals: dict) -> str:
    note = totals.get("shipping_note")
    fee = totals.get("shipping_fee") or 0
    if note == "store_pickup":
        return "Store pickup — no courier charge"
    if note == "threshold":
        return "Free delivery — order qualifies for free shipping"
    if note == "inside_city_free":
        return "Free delivery inside your city"
    if note == "inside_city":
        return f"Inside-city courier: BDT {fee}"
    if note == "outside_city":
        return f"Outside-city courier: BDT {fee}"
    return f"Courier: BDT {fee}"


def _handle_sslcommerz_callback(request, *, fail: bool = False):
    from django.conf import settings as dj_settings
    from django.http import HttpResponseRedirect

    from shop.services.invoicing import approve_payment
    from shop.services.payments.sslcommerz import validate_ipn_or_success, verify_store_hash

    payload = request.data if request.method == "POST" else request.query_params
    payload = {k: payload.get(k) for k in payload.keys()}
    front = dj_settings.FRONTEND_URL.rstrip("/")

    if fail:
        order_id = payload.get("value_a") or ""
        return HttpResponseRedirect(f"{front}/order/confirmation/{order_id}?pay=failed")

    if not verify_store_hash(payload):
        return HttpResponseRedirect(f"{front}/shop/checkout?pay=invalid")

    result = validate_ipn_or_success(payload)
    order_id = result.get("order_id")
    payment_id = result.get("payment_id")
    if not order_id:
        return HttpResponseRedirect(f"{front}/track?pay=unknown")

    order = Order.objects.filter(id=order_id).first()
    payment = None
    if payment_id:
        payment = Payment.objects.filter(id=payment_id, order_id=order_id).first()
    if not payment and order:
        payment = Payment.objects.filter(order_id=order.id).order_by("id").first()

    if result.get("ok") and payment and payment.status != PaymentStatus.COMPLETED:
        if result.get("validated") or result.get("bank_tran_id") or result.get("tran_id"):
            payment.wallet_txn_id = result.get("bank_tran_id") or result.get("tran_id")
            payment.reference = result.get("tran_id") or payment.reference
            payment.save(update_fields=["wallet_txn_id", "reference", "updated_at"])
            if result.get("validated"):
                approve_payment(payment, admin_note="SSLCommerz auto-approved")

    return HttpResponseRedirect(f"{front}/order/confirmation/{order_id}?pay=ok")


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def sslcommerz_success(request):
    return _handle_sslcommerz_callback(request, fail=False)


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def sslcommerz_fail(request):
    return _handle_sslcommerz_callback(request, fail=True)


@api_view(["POST", "GET"])
@permission_classes([AllowAny])
def sslcommerz_cancel(request):
    return _handle_sslcommerz_callback(request, fail=True)


@api_view(["POST"])
@permission_classes([AllowAny])
def sslcommerz_ipn(request):
    """Server-to-server Instant Payment Notification — authoritative approval path."""
    from shop.services.invoicing import approve_payment
    from shop.services.payments.sslcommerz import validate_ipn_or_success, verify_store_hash

    payload = {k: request.data.get(k) for k in request.data.keys()}
    if not verify_store_hash(payload):
        return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)
    result = validate_ipn_or_success(payload)
    if not result.get("ok") or not result.get("validated"):
        return Response({"detail": "Payment not valid", "status": result.get("raw_status")})

    payment = None
    if result.get("payment_id"):
        payment = Payment.objects.filter(id=result["payment_id"]).first()
    if not payment and result.get("order_id"):
        payment = Payment.objects.filter(order_id=result["order_id"]).order_by("id").first()
    if not payment:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
    if payment.status != PaymentStatus.COMPLETED:
        payment.wallet_txn_id = result.get("bank_tran_id") or result.get("tran_id")
        payment.reference = result.get("tran_id") or payment.reference
        payment.save(update_fields=["wallet_txn_id", "reference", "updated_at"])
        approve_payment(payment, admin_note="SSLCommerz IPN")
    return Response({"message": "OK", "order_id": payment.order_id})


@api_view(["GET"])
@authentication_classes([OptionalJWTAuthentication])
@permission_classes([AllowAny])
def download_order_pdf(request, order_id):
    """Download receipt or packing invoice as PDF."""
    from django.http import HttpResponse

    from shop.services.documents import build_order_pdf

    mode = (request.query_params.get("mode") or "receipt").lower()
    if mode not in ("receipt", "invoice"):
        mode = "receipt"

    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)

    user = request.user if request.user and getattr(request.user, "is_authenticated", False) else None
    token = (request.query_params.get("token") or "").strip()
    allowed = False
    if token and order.track_token == token:
        allowed = True
    elif user:
        if order.user_id == user.id:
            allowed = True
        elif user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
            allowed = True
        elif user.role == UserRole.VENDOR and OrderItem.objects.filter(
            order_id=order.id, vendor_id=user.id
        ).exists():
            allowed = True
        elif order.issuer_id == user.id and user.role in (
            UserRole.VENDOR,
            UserRole.VET,
            UserRole.BREEDER,
            UserRole.TRADER,
            UserRole.SHELTER,
        ):
            allowed = True
        # Shoppers may only download their receipt (not packing invoice of other sellers)
        if allowed and mode == "invoice" and user.role == UserRole.OWNER and order.user_id == user.id:
            # Shoppers still get an invoice copy for their records (Amazon style order invoice)
            pass
    if not allowed:
        return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

    pdf_bytes = build_order_pdf(order, mode=mode)
    filename = f"{mode}-{order.public_order_number}.pdf"
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
