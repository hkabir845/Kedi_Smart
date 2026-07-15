from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import User, UserRole, VerificationRequest, VerificationStatus, VerificationType
from api.authentication import require_roles
from api.views import serialize_model, serialize_models
from marketplace.models import ListingStatus, PetListing
from shop.models import Order, Payment, PaymentStatus, Product, ProductApprovalStatus, ProductSourceType
from shop.services.invoicing import approve_payment
from api.views.shop import _serialize_order
from siteplatform.models import ModerationQueue, ModerationStatus, SiteSetting
from vets.models import VetProfile


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def admin_dashboard(request):
    user_count = User.objects.count()
    order_count = Order.objects.count()
    product_count = Product.objects.count()
    listing_count = PetListing.objects.count()
    pending_moderation = ModerationQueue.objects.filter(status=ModerationStatus.PENDING).count()
    pending_verifications = VerificationRequest.objects.filter(status=VerificationStatus.PENDING).count()

    revenue = (
        Order.objects.filter(status="delivered").aggregate(total=Sum("total"))["total"] or 0
    )

    return Response(
        {
            "users": user_count,
            "orders": order_count,
            "products": product_count,
            "listings": listing_count,
            "pending_moderation": pending_moderation,
            "pending_verifications": pending_verifications,
            "revenue": float(revenue) if revenue else 0,
        }
    )


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def list_users(request):
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 50))
    users = User.objects.all()[skip : skip + limit]
    return Response(serialize_models(users))


@api_view(["PUT"])
@require_roles(UserRole.SUPER_ADMIN)
def update_user_role(request, user_id):
    role = request.data.get("role") or request.query_params.get("role")
    valid_roles = {c.value for c in UserRole}
    if role not in valid_roles:
        return Response({"detail": "Invalid role"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user.role = role
    # Keep Django admin access in sync with platform staff roles
    if role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        user.is_staff = True
        if role == UserRole.SUPER_ADMIN:
            user.is_superuser = True
        user.save(update_fields=["role", "is_staff", "is_superuser"])
    else:
        user.is_staff = False
        user.is_superuser = False
        user.save(update_fields=["role", "is_staff", "is_superuser"])
    return Response(serialize_model(user))


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def list_verifications(request):
    status_filter = request.query_params.get("status")
    queryset = VerificationRequest.objects.all()
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    requests = queryset.order_by("-created_at")
    return Response(serialize_models(requests))


@api_view(["PUT"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def approve_verification(request, request_id):
    user = request.user
    notes = request.data.get("notes")

    verification = VerificationRequest.objects.filter(id=request_id).first()
    if not verification:
        return Response({"detail": "Verification request not found"}, status=status.HTTP_404_NOT_FOUND)

    verification.status = VerificationStatus.APPROVED
    verification.admin_notes = notes
    verification.reviewed_by_id = user.id
    verification.reviewed_at = timezone.now().isoformat()
    verification.save()

    target_user = User.objects.filter(id=verification.user_id).first()
    if target_user:
        target_user.is_verified = True
        target_user.save(update_fields=["is_verified"])

        if verification.type == VerificationType.VENDOR and target_user.role == UserRole.VENDOR:
            from accounts.services.vendor import approve_vendor_user

            approve_vendor_user(target_user)

        elif verification.type == VerificationType.VET and target_user.role == UserRole.VET:
            profile = VetProfile.objects.filter(user_id=target_user.id).first()
            if profile:
                profile.verification_status = "approved"
                profile.save(update_fields=["verification_status"])

    return Response(serialize_model(verification))


@api_view(["PUT"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def reject_verification(request, request_id):
    user = request.user
    notes = request.data.get("notes")

    verification = VerificationRequest.objects.filter(id=request_id).first()
    if not verification:
        return Response({"detail": "Verification request not found"}, status=status.HTTP_404_NOT_FOUND)

    verification.status = VerificationStatus.REJECTED
    verification.admin_notes = notes
    verification.reviewed_by_id = user.id
    verification.reviewed_at = timezone.now().isoformat()
    verification.save()

    return Response(serialize_model(verification))


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def list_moderation_queue(request):
    status_filter = request.query_params.get("status")
    queryset = ModerationQueue.objects.all()
    if status_filter:
        queryset = queryset.filter(status=status_filter)

    items = queryset.order_by("-created_at")
    return Response(serialize_models(items))


@api_view(["PUT"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def approve_moderation(request, queue_id):
    user = request.user
    notes = request.data.get("notes")

    item = ModerationQueue.objects.filter(id=queue_id).first()
    if not item:
        return Response({"detail": "Moderation item not found"}, status=status.HTTP_404_NOT_FOUND)

    item.status = ModerationStatus.APPROVED
    item.admin_id = user.id
    item.notes = notes
    item.save()

    if item.entity_type == "listing":
        listing = PetListing.objects.filter(id=item.entity_id).first()
        if listing:
            listing.status = ListingStatus.PUBLISHED
            listing.save(update_fields=["status"])
    elif item.entity_type == "product":
        product = Product.objects.filter(id=item.entity_id).first()
        if product:
            product.approval_status = ProductApprovalStatus.APPROVED
            product.status = "published"
            product.save(update_fields=["approval_status", "status"])

    return Response(serialize_model(item))


@api_view(["PUT"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def reject_moderation(request, queue_id):
    user = request.user
    notes = request.data.get("notes")

    item = ModerationQueue.objects.filter(id=queue_id).first()
    if not item:
        return Response({"detail": "Moderation item not found"}, status=status.HTTP_404_NOT_FOUND)

    item.status = ModerationStatus.REJECTED
    item.admin_id = user.id
    item.notes = notes
    item.save()

    if item.entity_type == "listing":
        listing = PetListing.objects.filter(id=item.entity_id).first()
        if listing:
            listing.status = ListingStatus.REJECTED
            listing.save(update_fields=["status"])
    elif item.entity_type == "product":
        product = Product.objects.filter(id=item.entity_id).first()
        if product:
            product.approval_status = ProductApprovalStatus.REJECTED
            product.save(update_fields=["approval_status"])

    return Response(serialize_model(item))


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def list_all_orders(request):
    skip = int(request.query_params.get("skip", 0))
    limit = int(request.query_params.get("limit", 50))
    pending_payment = request.query_params.get("pending_payment")
    qs = Order.objects.order_by("-created_at")
    if pending_payment in ("1", "true", "yes"):
        qs = qs.filter(payments__status=PaymentStatus.PENDING).distinct()
    orders = qs[skip : skip + limit]
    return Response(
        [_serialize_order(o, include_items=True, include_docs=True, for_buyer=False) for o in orders]
    )


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def get_order(request, order_id: int):
    """Back-office order detail with shared fulfillment invoice + customer receipt."""
    from shop.services.invoicing import ensure_documents_for_order

    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    ensure_documents_for_order(order)
    data = _serialize_order(order, include_items=True, include_docs=True, for_buyer=False)
    data["document_role"] = "fulfillment"
    return Response(data)


@api_view(["GET"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def list_pending_payments(request):
    payments = (
        Payment.objects.filter(status=PaymentStatus.PENDING)
        .select_related("order")
        .order_by("-created_at")[:100]
    )
    rows = []
    for payment in payments:
        row = serialize_model(payment)
        row["order"] = _serialize_order(payment.order, include_items=False)
        rows.append(row)
    return Response(rows)


@api_view(["POST"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def approve_order_payment(request, order_id):
    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    payment = Payment.objects.filter(order_id=order.id).order_by("id").first()
    if not payment:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)
    if payment.status == PaymentStatus.COMPLETED:
        return Response(_serialize_order(order, include_items=True, include_docs=True, for_buyer=False))
    approve_payment(
        payment,
        approved_by=request.user,
        admin_note=request.data.get("admin_note"),
    )
    order.refresh_from_db()
    return Response(_serialize_order(order, include_items=True, include_docs=True, for_buyer=False))


@api_view(["POST"])
@require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
def update_order_status(request, order_id):
    from shop.models import DocumentStatus, Invoice, OrderStatus, Payment, PaymentStatus, Receipt
    from shop.services.commission import reverse_vendor_ledger_for_order
    from shop.services.inventory import restore_stock_for_order

    order = Order.objects.filter(id=order_id).first()
    if not order:
        return Response({"detail": "Order not found"}, status=status.HTTP_404_NOT_FOUND)
    new_status = (request.data.get("status") or "").strip()
    valid = {c.value for c in OrderStatus}
    if new_status not in valid:
        return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
    previous = order.status
    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    if new_status in (OrderStatus.CANCELLED, OrderStatus.REFUNDED) and previous not in (
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
    ):
        restore_stock_for_order(order, actor=request.user, note=f"Restock on {new_status}")
        reverse_vendor_ledger_for_order(order, note=f"Reversed on {new_status}")
        payment = Payment.objects.filter(order_id=order.id).order_by("id").first()
        if payment and payment.status == PaymentStatus.COMPLETED:
            payment.status = PaymentStatus.REFUNDED
            note = (payment.admin_note or "").strip()
            payment.admin_note = f"{note} | Marked {new_status}".strip(" |")
            payment.save(update_fields=["status", "admin_note", "updated_at"])
        for Model in (Invoice, Receipt):
            doc = Model.objects.filter(order_id=order.id).first()
            if doc and doc.status != DocumentStatus.VOID:
                doc.status = DocumentStatus.VOID
                doc.save(update_fields=["status", "updated_at"])
    else:
        try:
            from shop.services.notify import notify_order_status

            notify_order_status(order, new_status)
        except Exception:
            pass
    return Response(_serialize_order(order, include_items=True, include_docs=True, for_buyer=False))


@api_view(["GET"])
@require_roles(UserRole.SUPER_ADMIN)
def list_settings(request):
    settings_list = SiteSetting.objects.all()
    return Response(serialize_models(settings_list))


@api_view(["PUT"])
@require_roles(UserRole.SUPER_ADMIN)
def update_setting(request, key):
    value_json = request.data.get("value_json")

    setting = SiteSetting.objects.filter(key=key).first()
    if not setting:
        setting = SiteSetting.objects.create(key=key, value_json=value_json)
    else:
        setting.value_json = value_json
        setting.save(update_fields=["value_json"])

    return Response(serialize_model(setting))
