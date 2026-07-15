"""SSLCommerz hosted checkout — initiate session + validate IPN / success callback."""

from __future__ import annotations

import hashlib
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)


class SSLCommerzError(Exception):
    pass


def sslcommerz_enabled() -> bool:
    return bool(getattr(settings, "SSLCOMMERZ_STORE_ID", "") and getattr(settings, "SSLCOMMERZ_STORE_PASSWD", ""))


def _api_base() -> str:
    if getattr(settings, "SSLCOMMERZ_SANDBOX", True):
        return "https://sandbox.sslcommerz.com"
    return "https://securepay.sslcommerz.com"


def _post_form(url: str, data: dict) -> dict:
    encoded = urllib.parse.urlencode({k: v for k, v in data.items() if v is not None}).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise SSLCommerzError(f"SSLCommerz HTTP {exc.code}: {body[:300]}") from exc
    except Exception as exc:
        raise SSLCommerzError(f"SSLCommerz request failed: {exc}") from exc
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SSLCommerzError("Invalid SSLCommerz response") from exc


def initiate_payment(*, order, payment, customer_name: str, customer_email: str, customer_phone: str) -> dict:
    """Create a hosted payment session. Returns {gateway_url, sessionkey}."""
    if not sslcommerz_enabled():
        raise SSLCommerzError(
            "Online card payment is not configured. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWD."
        )

    app_url = settings.APP_URL.rstrip("/")
    front = settings.FRONTEND_URL.rstrip("/")
    tran_id = f"KS{order.id}-{payment.id}"
    payload = {
        "store_id": settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWD,
        "total_amount": f"{Decimal(payment.amount or order.total):.2f}",
        "currency": order.currency or "BDT",
        "tran_id": tran_id,
        "success_url": f"{app_url}/api/v1/shop/payments/sslcommerz/success",
        "fail_url": f"{app_url}/api/v1/shop/payments/sslcommerz/fail",
        "cancel_url": f"{app_url}/api/v1/shop/payments/sslcommerz/cancel",
        "ipn_url": f"{app_url}/api/v1/shop/payments/sslcommerz/ipn",
        "cus_name": (customer_name or "Customer")[:50],
        "cus_email": (customer_email or "noreply@kedismart.com")[:50],
        "cus_phone": (customer_phone or "01700000000")[:20],
        "cus_add1": "Dhaka",
        "cus_city": "Dhaka",
        "cus_country": "Bangladesh",
        "shipping_method": "NO",
        "product_name": order.public_order_number,
        "product_category": "Pet",
        "product_profile": "general",
        "value_a": str(order.id),
        "value_b": str(payment.id),
        "value_c": order.track_token or "",
    }
    result = _post_form(f"{_api_base()}/gwprocess/v4/api.php", payload)
    status = (result.get("status") or "").upper()
    if status != "SUCCESS":
        raise SSLCommerzError(result.get("failedreason") or result.get("status") or "Could not start payment")
    gateway_url = result.get("GatewayPageURL") or result.get("redirectGatewayURL")
    sessionkey = result.get("sessionkey") or ""
    if not gateway_url:
        raise SSLCommerzError("SSLCommerz did not return a payment URL")
    payment.gateway_session_key = sessionkey
    payment.gateway_tran_id = tran_id
    payment.reference = tran_id
    payment.save(update_fields=["gateway_session_key", "gateway_tran_id", "reference", "updated_at"])
    return {"gateway_url": gateway_url, "sessionkey": sessionkey, "tran_id": tran_id}


def validate_ipn_or_success(payload: dict) -> dict:
    """Validate payment with SSLCommerz and return normalized result.

    Returns {ok, order_id, payment_id, tran_id, amount, bank_tran_id}.
    """
    if not sslcommerz_enabled():
        raise SSLCommerzError("SSLCommerz is not configured")

    val_id = payload.get("val_id") or ""
    if not val_id:
        # Soft success redirect may only include status + tran_id; require IPN for approval
        status = (payload.get("status") or "").upper()
        return {
            "ok": status in ("VALID", "VALIDATED", "SUCCESS"),
            "order_id": int(payload.get("value_a") or 0) or None,
            "payment_id": int(payload.get("value_b") or 0) or None,
            "tran_id": payload.get("tran_id"),
            "amount": payload.get("amount"),
            "bank_tran_id": payload.get("bank_tran_id"),
            "validated": False,
        }

    result = _post_form(
        f"{_api_base()}/validator/api/validationserverAPI.php",
        {
            "val_id": val_id,
            "store_id": settings.SSLCOMMERZ_STORE_ID,
            "store_passwd": settings.SSLCOMMERZ_STORE_PASSWD,
            "format": "json",
        },
    )
    status = (result.get("status") or "").upper()
    ok = status in ("VALID", "VALIDATED")
    order_id = None
    payment_id = None
    try:
        order_id = int(result.get("value_a") or payload.get("value_a") or 0) or None
        payment_id = int(result.get("value_b") or payload.get("value_b") or 0) or None
    except (TypeError, ValueError):
        pass
    return {
        "ok": ok,
        "order_id": order_id,
        "payment_id": payment_id,
        "tran_id": result.get("tran_id") or payload.get("tran_id"),
        "amount": result.get("amount") or payload.get("amount"),
        "bank_tran_id": result.get("bank_tran_id") or payload.get("bank_tran_id"),
        "validated": True,
        "raw_status": status,
    }


def verify_store_hash(payload: dict) -> bool:
    """Optional MD5 store password check when gateway sends verify_sign."""
    verify_sign = payload.get("verify_sign")
    verify_key = payload.get("verify_key")
    if not verify_sign or not verify_key:
        return True
    keys = [k.strip() for k in verify_key.split(",") if k.strip()]
    parts = []
    for key in keys:
        parts.append(f"{key}={payload.get(key, '')}")
    parts.append(f"store_passwd={getattr(settings, 'SSLCOMMERZ_STORE_PASSWD', '')}")
    digest = hashlib.md5("&".join(parts).encode("utf-8")).hexdigest()
    return digest == verify_sign
