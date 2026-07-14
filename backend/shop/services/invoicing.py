"""Invoice / receipt generation and payment approval for Kedi Smart shop orders."""

from __future__ import annotations

import secrets
import re
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from shop.models import (
    DocumentStatus,
    FulfillmentType,
    Invoice,
    Order,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Receipt,
)
from siteplatform.services import get_setting_value


SELLER_DEFAULTS = {
    "name": "Kedi Smart",
    "phone": "+880 1898-941782",
    "email": "info@kedismart.com",
    "address": "A.B.M Tower, Gulshan 2, Dhaka 1212",
}

FREE_DELIVERY_THRESHOLD = Decimal("1500.00")
STANDARD_SHIPPING = Decimal("100.00")
TAX_RATE = Decimal("0.05")

WALLET_METHODS = {PaymentMethod.BKASH, PaymentMethod.NAGAD, PaymentMethod.MANUAL}


def seller_snapshot() -> dict[str, str]:
    return {
        "name": str(get_setting_value("brand.app_name", SELLER_DEFAULTS["name"]) or SELLER_DEFAULTS["name"]),
        "phone": str(get_setting_value("contact.phone", SELLER_DEFAULTS["phone"]) or SELLER_DEFAULTS["phone"]),
        "email": str(get_setting_value("contact.email", SELLER_DEFAULTS["email"]) or SELLER_DEFAULTS["email"]),
        "address": str(
            get_setting_value("contact.address", SELLER_DEFAULTS["address"]) or SELLER_DEFAULTS["address"]
        ),
    }


def normalize_phone(phone: str | None) -> str:
    if not phone:
        return ""
    return re.sub(r"\D+", "", phone)


def phones_match(a: str | None, b: str | None) -> bool:
    na, nb = normalize_phone(a), normalize_phone(b)
    if not na or not nb:
        return False
    return na == nb or na.endswith(nb[-10:]) or nb.endswith(na[-10:])


def make_track_token() -> str:
    return secrets.token_urlsafe(24)


def resolve_payment_method(raw: str | None) -> str:
    value = (raw or PaymentMethod.COD).strip()
    aliases = {
        "cod": PaymentMethod.COD,
        "bkash": PaymentMethod.BKASH,
        "nagad": PaymentMethod.NAGAD,
        "store_pickup": PaymentMethod.STORE_PICKUP,
        "store-pickup": PaymentMethod.STORE_PICKUP,
        "pickup": PaymentMethod.STORE_PICKUP,
        "manual": PaymentMethod.MANUAL,
    }
    key = value.lower().replace(" ", "_")
    if key in aliases:
        return aliases[key]
    valid = {c.value for c in PaymentMethod}
    if value in valid:
        return value
    return PaymentMethod.COD


def fulfillment_for_method(method: str) -> str:
    if method == PaymentMethod.STORE_PICKUP:
        return FulfillmentType.STORE_PICKUP
    return FulfillmentType.DELIVERY


def compute_order_totals(subtotal: Decimal, fulfillment_type: str) -> dict[str, Decimal]:
    if fulfillment_type == FulfillmentType.STORE_PICKUP:
        shipping = Decimal("0.00")
    elif subtotal >= FREE_DELIVERY_THRESHOLD:
        shipping = Decimal("0.00")
    else:
        shipping = STANDARD_SHIPPING
    tax = (subtotal * TAX_RATE).quantize(Decimal("0.01"))
    total = subtotal + shipping + tax
    return {"shipping_fee": shipping, "tax": tax, "total": total}


def payment_instructions(method: str) -> dict:
    seller = seller_snapshot()
    bkash = str(get_setting_value("commerce.bkash_number", "+880 1898-941782") or "+880 1898-941782")
    nagad = str(get_setting_value("commerce.nagad_number", "+880 1898-941782") or "+880 1898-941782")
    pickup = str(get_setting_value("commerce.pickup_address", seller["address"]) or seller["address"])

    if method == PaymentMethod.COD:
        return {
            "title": "Cash on Delivery",
            "steps": [
                "Your invoice is reserved. Pay cash when the parcel arrives.",
                "Our courier may call the phone on your invoice before delivery.",
                "A paid receipt is issued after collection is confirmed.",
            ],
        }
    if method == PaymentMethod.BKASH:
        return {
            "title": "bKash payment",
            "wallet_number": bkash,
            "steps": [
                f"Send the invoice total to bKash {bkash} (Payment / Send Money).",
                "Use your order number as the reference.",
                "Submit the Txn ID if you have not already — our team will verify and approve.",
                "Your paid receipt unlocks after approval.",
            ],
        }
    if method == PaymentMethod.NAGAD:
        return {
            "title": "Nagad payment",
            "wallet_number": nagad,
            "steps": [
                f"Send the invoice total to Nagad {nagad}.",
                "Use your order number as the reference.",
                "Keep the Txn ID ready — admin verifies before packing.",
                "Your paid receipt unlocks after approval.",
            ],
        }
    if method == PaymentMethod.STORE_PICKUP:
        return {
            "title": "Store pickup",
            "pickup_address": pickup,
            "steps": [
                f"Collect from: {pickup}.",
                f"Bring a photo ID and quote order {seller['phone']} contact if needed.",
                "Pay at the counter (cash or mobile wallet).",
                "Receipt is issued when pickup payment is confirmed.",
            ],
        }
    return {
        "title": "Manual payment",
        "steps": [
            "Follow the payment instructions sent for your invoice.",
            "Share the transaction reference with support for approval.",
        ],
    }


def _next_doc_number(prefix: str, order_id: int) -> str:
    year = timezone.now().year
    return f"{prefix}-{year}-{order_id:05d}"


@transaction.atomic
def create_invoice_and_receipt(order: Order, payment: Payment) -> tuple[Invoice, Receipt]:
    seller = seller_snapshot()
    invoice, _ = Invoice.objects.get_or_create(
        order=order,
        defaults={
            "number": _next_doc_number("KS-INV", order.id),
            "status": DocumentStatus.AWAITING_PAYMENT,
            "seller_name": seller["name"],
            "seller_phone": seller["phone"],
            "seller_email": seller["email"],
            "seller_address": seller["address"],
            "notes": "Invoice awaiting payment approval.",
        },
    )
    receipt, _ = Receipt.objects.get_or_create(
        order=order,
        defaults={
            "invoice": invoice,
            "payment": payment,
            "number": _next_doc_number("KS-RCP", order.id),
            "status": DocumentStatus.AWAITING_PAYMENT,
            "amount": order.total,
            "currency": order.currency,
            "seller_name": seller["name"],
            "seller_phone": seller["phone"],
            "seller_email": seller["email"],
            "seller_address": seller["address"],
        },
    )
    if receipt.payment_id != payment.id:
        receipt.payment = payment
        receipt.save(update_fields=["payment", "updated_at"])
    return invoice, receipt


@transaction.atomic
def approve_payment(payment: Payment, *, approved_by=None, admin_note: str | None = None) -> Payment:
    now = timezone.now()
    payment.status = PaymentStatus.COMPLETED
    payment.approved_at = now
    payment.approved_by = approved_by
    if admin_note:
        payment.admin_note = admin_note
    if payment.amount is None and payment.order_id:
        payment.amount = payment.order.total
    payment.save()

    order = payment.order
    if order.status in (OrderStatus.PENDING, OrderStatus.PAID):
        if order.fulfillment_type == FulfillmentType.STORE_PICKUP:
            order.status = OrderStatus.PROCESSING
        else:
            order.status = OrderStatus.PAID
        order.save(update_fields=["status", "updated_at"])

    invoice = Invoice.objects.filter(order_id=order.id).first()
    if invoice:
        invoice.status = DocumentStatus.PAID
        invoice.notes = "Payment approved."
        invoice.save(update_fields=["status", "notes", "updated_at"])

    receipt = Receipt.objects.filter(order_id=order.id).first()
    if receipt:
        receipt.status = DocumentStatus.PAID
        receipt.paid_at = now
        receipt.payment = payment
        receipt.amount = payment.amount or order.total
        receipt.save(update_fields=["status", "paid_at", "payment", "amount", "updated_at"])
    else:
        create_invoice_and_receipt(order, payment)
        receipt = Receipt.objects.filter(order_id=order.id).first()
        if receipt:
            receipt.status = DocumentStatus.PAID
            receipt.paid_at = now
            receipt.save(update_fields=["status", "paid_at", "updated_at"])

    return payment


def order_timeline(order: Order) -> list[dict]:
    """Customer-facing tracker steps (Daraz / Shopify style)."""
    payment = order.payments.order_by("id").first()
    payment_done = payment and payment.status == PaymentStatus.COMPLETED
    fulfillment = order.fulfillment_type

    steps = [
        {
            "key": "placed",
            "label": "Order placed",
            "done": True,
            "active": order.status == OrderStatus.PENDING and not payment_done,
        },
        {
            "key": "payment",
            "label": "Payment",
            "done": bool(payment_done),
            "active": order.status == OrderStatus.PENDING and not payment_done,
            "detail": "Awaiting approval" if not payment_done else "Confirmed",
        },
    ]

    if fulfillment == FulfillmentType.STORE_PICKUP:
        steps.extend(
            [
                {
                    "key": "processing",
                    "label": "Preparing",
                    "done": order.status
                    in (
                        OrderStatus.PROCESSING,
                        OrderStatus.READY_FOR_PICKUP,
                        OrderStatus.DELIVERED,
                    ),
                    "active": order.status == OrderStatus.PROCESSING,
                },
                {
                    "key": "ready",
                    "label": "Ready for pickup",
                    "done": order.status in (OrderStatus.READY_FOR_PICKUP, OrderStatus.DELIVERED),
                    "active": order.status == OrderStatus.READY_FOR_PICKUP,
                },
                {
                    "key": "complete",
                    "label": "Picked up",
                    "done": order.status == OrderStatus.DELIVERED,
                    "active": False,
                },
            ]
        )
    else:
        steps.extend(
            [
                {
                    "key": "processing",
                    "label": "Processing",
                    "done": order.status
                    in (
                        OrderStatus.PAID,
                        OrderStatus.PROCESSING,
                        OrderStatus.SHIPPED,
                        OrderStatus.DELIVERED,
                    ),
                    "active": order.status in (OrderStatus.PAID, OrderStatus.PROCESSING),
                },
                {
                    "key": "shipped",
                    "label": "Shipped",
                    "done": order.status in (OrderStatus.SHIPPED, OrderStatus.DELIVERED),
                    "active": order.status == OrderStatus.SHIPPED,
                },
                {
                    "key": "delivered",
                    "label": "Delivered",
                    "done": order.status == OrderStatus.DELIVERED,
                    "active": False,
                },
            ]
        )

    if order.status in (OrderStatus.CANCELLED, OrderStatus.REFUNDED):
        for step in steps:
            step["active"] = False
        steps.append(
            {
                "key": "closed",
                "label": order.get_status_display(),
                "done": True,
                "active": True,
            }
        )

    return steps
