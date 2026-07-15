"""Order emails + in-app notifications."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from siteplatform.models import Notification, NotificationType

logger = logging.getLogger(__name__)


def _recipient_email(order) -> str | None:
    if order.user_id and getattr(order.user, "email", None):
        return order.user.email
    return order.guest_email or None


def notify_user(*, user_id: int | None, title: str, body: str, ntype: str = NotificationType.ORDER) -> None:
    if not user_id:
        return
    try:
        Notification.objects.create(user_id=user_id, type=ntype, title=title, body=body)
    except Exception:
        logger.exception("Failed to create in-app notification")


def send_order_email(order, *, subject: str, body: str) -> None:
    email = _recipient_email(order)
    if not email:
        return
    try:
        send_mail(
            subject,
            body,
            getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@kedismart.com"),
            [email],
            fail_silently=True,
        )
    except Exception:
        logger.exception("Failed to send order email to %s", email)


def notify_order_placed(order) -> None:
    number = order.public_order_number
    subject = f"Order {number} placed — Kedi Smart"
    body = (
        f"Thanks for your order {number}.\n\n"
        f"Total: {order.currency} {order.total}\n"
        f"Track: {settings.FRONTEND_URL.rstrip('/')}/track?order={order.id}\n"
    )
    if order.track_token:
        body += f"Token: {order.track_token}\n"
    send_order_email(order, subject=subject, body=body)
    notify_user(
        user_id=order.user_id,
        title=f"Order {number} placed",
        body=f"We received your order for {order.currency} {order.total}.",
        ntype=NotificationType.ORDER,
    )


def notify_payment_approved(order) -> None:
    number = order.public_order_number
    subject = f"Payment confirmed — {number}"
    body = (
        f"Payment for order {number} is confirmed.\n"
        f"We are preparing your items.\n"
        f"Track: {settings.FRONTEND_URL.rstrip('/')}/track?order={order.id}\n"
    )
    send_order_email(order, subject=subject, body=body)
    notify_user(
        user_id=order.user_id,
        title=f"Payment confirmed for {number}",
        body="Your receipt is marked paid. Fulfillment will begin shortly.",
        ntype=NotificationType.SUCCESS,
    )


def notify_order_status(order, new_status: str) -> None:
    number = order.public_order_number
    label = new_status.replace("_", " ")
    subject = f"Order {number} update — {label}"
    body = (
        f"Your order {number} is now: {label}.\n"
        f"Track: {settings.FRONTEND_URL.rstrip('/')}/track?order={order.id}\n"
    )
    send_order_email(order, subject=subject, body=body)
    notify_user(
        user_id=order.user_id,
        title=f"Order {number}: {label}",
        body=f"Status updated to {label}.",
        ntype=NotificationType.ORDER,
    )


def notify_vendor_payout_requested(vendor_user_id: int, amount, payout_id: int) -> None:
    notify_user(
        user_id=vendor_user_id,
        title="Payout requested",
        body=f"Your payout request #{payout_id} for BDT {amount} is pending platform review.",
        ntype=NotificationType.INFO,
    )
