from datetime import datetime
from decimal import Decimal

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import User, UserProfile, UserRole, VendorProfile
from api.authentication import JWTAuthentication, OptionalJWTAuthentication, get_current_user, require_roles
from api.security import get_password_hash, verify_password
from api.views.auth import _issue_tokens
from api.utils import slugify
from api.views import paginate_queryset, serialize_model, serialize_models
from shop.models import (
    Cart,
    CartItem,
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
    ProductReview,
    ProductSourceType,
    ProductStatus,
    ProductVariant,
    ProductVideo,
    ShippingAddress,
)
from shop.services.commission import (
    calculate_line_fees,
    platform_product_defaults,
    record_vendor_ledger,
    vendor_product_defaults,
)
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


def _serialize_order(order, include_items=False):
    data = serialize_model(order)
    if include_items:
        items = OrderItem.objects.filter(order_id=order.id)
        data["items"] = serialize_models(items)
        shipping = ShippingAddress.objects.filter(order_id=order.id).first()
        data["shipping_address"] = serialize_model(shipping) if shipping else None
        payment = Payment.objects.filter(order_id=order.id).first()
        data["payment"] = serialize_model(payment) if payment else None
    return data


def _serialize_variant(variant):
    data = serialize_model(variant)
    return data


def _serialize_product_list_item(product):
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
        if not profile.is_approved or not profile.is_active:
            return Response(
                {"detail": "Vendor account not approved yet"},
                status=status.HTTP_403_FORBIDDEN,
            )

    slug = slugify(data["title"])
    if Product.objects.filter(slug=slug).exists():
        slug = f"{slug}-{datetime.now().timestamp()}"

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

    price = data.get("price")
    if price is not None:
        sku = data.get("sku") or f"SKU-{product.id:04d}"
        if ProductVariant.objects.filter(sku=sku).exists():
            sku = f"{sku}-{int(datetime.now().timestamp())}"
        ProductVariant.objects.create(
            product=product,
            sku=sku,
            price=Decimal(str(price)),
            compare_at_price=Decimal(str(data["compare_at_price"])) if data.get("compare_at_price") else None,
            currency=data.get("currency", "BDT"),
            stock_qty=int(data.get("stock_qty", 0)),
            size=data.get("size"),
            flavor=data.get("flavor"),
            is_active=True,
        )

    if user.role == UserRole.VENDOR:
        ModerationQueue.objects.get_or_create(
            entity_type="product",
            entity_id=product.id,
            status=ModerationStatus.PENDING,
        )

    result = _serialize_product_list_item(product)
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([OptionalJWTAuthentication])
def get_cart(request):
    cart, current_user, session_id = _get_cart_for_request(request)
    if not current_user and not session_id:
        return Response({"detail": "User or session_id required"}, status=status.HTTP_400_BAD_REQUEST)

    if not cart:
        return Response({"items": [], "subtotal": 0})

    items = CartItem.objects.filter(cart_id=cart.id).select_related("variant", "variant__product")
    subtotal = sum(item.qty * item.variant.price for item in items if item.variant)
    return Response(
        {"items": [_serialize_cart_item(item) for item in items], "subtotal": float(subtotal)}
    )


@api_view(["POST"])
@authentication_classes([OptionalJWTAuthentication])
def add_to_cart(request):
    data = request.data
    variant_id = data.get("variant_id")
    qty = int(data.get("qty", 1))

    variant = ProductVariant.objects.filter(id=variant_id).first()
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

    existing_item = CartItem.objects.filter(cart_id=cart.id, variant_id=variant_id).first()
    if existing_item:
        existing_item.qty += qty
        existing_item.save(update_fields=["qty"])
    else:
        CartItem.objects.create(cart_id=cart.id, variant_id=variant_id, qty=qty)

    return Response({"message": "Item added to cart"}, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@authentication_classes([OptionalJWTAuthentication])
def remove_cart_item(request, item_id):
    cart, current_user, session_id = _get_cart_for_request(request)
    if not current_user and not session_id:
        return Response({"detail": "User or session_id required"}, status=status.HTTP_400_BAD_REQUEST)
    if not cart:
        return Response({"detail": "Cart not found"}, status=status.HTTP_404_NOT_FOUND)

    item = CartItem.objects.filter(id=item_id, cart_id=cart.id).first()
    if not item:
        return Response({"detail": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND)
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
        if len(password) < 6:
            return Response(
                {"detail": "Password must be at least 6 characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )
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

    shipping_data = data.get("shipping_address") or {}
    if not current_user and not account and not login_data:
        return Response(
            {"detail": "Please sign in or create an account to complete checkout"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    subtotal = sum(item.qty * item.variant.price for item in items if item.variant)
    shipping_fee = Decimal("100.00")
    tax = subtotal * Decimal("0.05")
    total = subtotal + shipping_fee + tax

    guest_email = None
    if not current_user:
        guest_email = (account or {}).get("email") or shipping_data.get("email")

    order = Order.objects.create(
        user_id=current_user.id if current_user else None,
        guest_email=guest_email,
        status=OrderStatus.PENDING,
        subtotal=subtotal,
        discount=Decimal("0.00"),
        shipping_fee=shipping_fee,
        tax=tax,
        total=total,
        currency="BDT",
    )

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
        record_vendor_ledger(order_item)

        if item.variant.stock_qty > 0:
            item.variant.stock_qty = max(0, item.variant.stock_qty - item.qty)
            item.variant.save(update_fields=["stock_qty"])

    ShippingAddress.objects.create(
        order_id=order.id,
        name=shipping_data["name"],
        phone=shipping_data["phone"],
        address=shipping_data["address"],
        city=shipping_data["city"],
        country=shipping_data.get("country", "Bangladesh"),
        notes=shipping_data.get("notes"),
    )

    if current_user:
        _sync_profile_from_shipping(current_user, shipping_data)

    payment_method = data.get("payment_method", "COD")
    Payment.objects.create(
        order_id=order.id,
        method=PaymentMethod(payment_method),
        status=PaymentStatus.PENDING,
    )

    CartItem.objects.filter(cart_id=cart.id).delete()
    cart.delete()

    order.refresh_from_db()
    response_data = serialize_model(order)
    if auth_tokens:
        response_data["auth"] = auth_tokens
    return Response(response_data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def list_orders(request):
    user = get_current_user(request)
    orders = Order.objects.filter(user_id=user.id).order_by("-created_at")
    return Response([_serialize_order(o) for o in orders])


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def get_order(request, order_id):
    user = get_current_user(request)
    order = Order.objects.filter(id=order_id, user_id=user.id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(_serialize_order(order, include_items=True))
