"""Seller-issued invoices (vendor, vet, breeder/trader/shelter) — manual + owned sales."""

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response

from accounts.models import UserRole
from api.authentication import JWTAuthentication, require_roles
from api.views import serialize_models
from api.views.shop import _serialize_order
from shop.models import Invoice, Order, OrderChannel, OrderItem, PaymentStatus, Receipt, ShippingAddress
from shop.services.invoicing import (
    SELLER_INVOICE_ROLES,
    create_manual_invoice,
    ensure_documents_for_order,
    issuer_seller_snapshot,
    mark_manual_paid,
    parse_issued_at,
    update_manual_invoice,
)

SELLER_ROLES = (
    UserRole.VENDOR,
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
)


def _assert_seller(user):
    if getattr(user, "role", None) not in SELLER_INVOICE_ROLES:
        return Response({"detail": "Seller role required"}, status=status.HTTP_403_FORBIDDEN)
    return None


def _can_access_order(user, order: Order) -> bool:
    if order.issuer_id == user.id:
        return True
    if OrderItem.objects.filter(order_id=order.id, vendor_id=user.id).exists():
        return True
    return False


def _serialize_invoice_order(order: Order, user):
    ensure_documents_for_order(order)
    data = _serialize_order(order, include_items=True, include_docs=True)
    data["channel"] = order.channel
    data["issuer_id"] = order.issuer_id
    payment_done = order.payments.filter(status=PaymentStatus.COMPLETED).exists()
    editable = (
        order.channel == OrderChannel.MANUAL
        and order.issuer_id == user.id
        and not payment_done
    )
    data["editable"] = editable
    data["can_mark_paid"] = (
        order.channel == OrderChannel.MANUAL
        and order.issuer_id == user.id
        and not payment_done
    )
    if user.role == UserRole.VENDOR and order.channel == OrderChannel.CHECKOUT:
        items = OrderItem.objects.filter(order_id=order.id, vendor_id=user.id)
        data["items"] = serialize_models(items)
        data["vendor_scope"] = True
    else:
        data["vendor_scope"] = False
    return data


@api_view(["GET", "POST"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES)
def seller_invoices(request):
    denied = _assert_seller(request.user)
    if denied:
        return denied

    user = request.user

    if request.method == "GET":
        manual_ids = list(
            Order.objects.filter(issuer_id=user.id, channel=OrderChannel.MANUAL)
            .order_by("-created_at")
            .values_list("id", flat=True)[:100]
        )
        online_ids = []
        if user.role == UserRole.VENDOR:
            online_ids = list(
                OrderItem.objects.filter(vendor_id=user.id)
                .exclude(order_id__in=manual_ids)
                .values_list("order_id", flat=True)
                .distinct()[:100]
            )
        ids = list(dict.fromkeys([*manual_ids, *online_ids]))
        orders = {o.id: o for o in Order.objects.filter(id__in=ids)}
        ships = {s.order_id: s.name for s in ShippingAddress.objects.filter(order_id__in=ids)}
        invoices = {inv.order_id: inv for inv in Invoice.objects.filter(order_id__in=ids)}
        results = []
        for oid in ids:
            order = orders.get(oid)
            if not order:
                continue
            ensure_documents_for_order(order)
            inv = invoices.get(oid) or Invoice.objects.filter(order_id=oid).first()
            results.append(
                {
                    "id": order.id,
                    "public_order_number": order.public_order_number,
                    "channel": order.channel,
                    "status": order.status,
                    "total": float(order.total),
                    "currency": order.currency,
                    "created_at": order.created_at,
                    "invoice_number": inv.number if inv else None,
                    "invoice_status": inv.status if inv else None,
                    "issued_at": inv.issued_at if inv else None,
                    "editable": order.channel == OrderChannel.MANUAL and order.issuer_id == user.id,
                    "customer_name": ships.get(oid),
                }
            )
        results.sort(key=lambda r: r.get("issued_at") or r.get("created_at"), reverse=True)
        return Response(results)

    try:
        order = create_manual_invoice(issuer=user, data=request.data or {})
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(_serialize_invoice_order(order, user), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES)
def seller_invoice_detail(request, order_id: int):
    denied = _assert_seller(request.user)
    if denied:
        return denied

    user = request.user
    order = Order.objects.filter(id=order_id).first()
    if not order or not _can_access_order(user, order):
        return Response({"detail": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(_serialize_invoice_order(order, user))

    data = request.data or {}
    if order.channel == OrderChannel.MANUAL and order.issuer_id == user.id:
        try:
            order = update_manual_invoice(order, issuer=user, data=data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response(_serialize_invoice_order(order, user))

    invoice = Invoice.objects.filter(order_id=order.id).first()
    receipt = Receipt.objects.filter(order_id=order.id).first()
    if not invoice:
        return Response({"detail": "Invoice missing"}, status=status.HTTP_400_BAD_REQUEST)

    if data.get("issued_at") or data.get("invoice_date"):
        issued = parse_issued_at(data.get("issued_at") or data.get("invoice_date"))
        invoice.issued_at = issued
        if receipt:
            receipt.issued_at = issued
            receipt.save(update_fields=["issued_at", "updated_at"])
    if "notes" in data:
        invoice.notes = data.get("notes")
    seller = data.get("seller") or {}
    for key, attr in (
        ("name", "seller_name"),
        ("phone", "seller_phone"),
        ("email", "seller_email"),
        ("address", "seller_address"),
    ):
        if seller.get(key) is not None:
            setattr(invoice, attr, str(seller[key]).strip())
            if receipt:
                setattr(receipt, attr, str(seller[key]).strip())
    invoice.save()
    if receipt and seller:
        receipt.save()
    return Response(_serialize_invoice_order(order, user))


@api_view(["POST"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES)
def seller_invoice_mark_paid(request, order_id: int):
    denied = _assert_seller(request.user)
    if denied:
        return denied
    user = request.user
    order = Order.objects.filter(id=order_id, issuer_id=user.id, channel=OrderChannel.MANUAL).first()
    if not order:
        return Response({"detail": "Manual invoice not found"}, status=status.HTTP_404_NOT_FOUND)
    try:
        mark_manual_paid(order, issuer=user)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(_serialize_invoice_order(order, user))


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@require_roles(*SELLER_ROLES)
def seller_invoice_defaults(request):
    denied = _assert_seller(request.user)
    if denied:
        return denied
    return Response({"seller": issuer_seller_snapshot(request.user)})
