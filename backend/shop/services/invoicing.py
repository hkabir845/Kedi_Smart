"""Invoice / receipt generation and payment approval for Kedi Smart shop orders."""

from __future__ import annotations

import secrets
import re
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from shop.models import (
    DocumentSequence,
    DocumentStatus,
    FulfillmentType,
    Invoice,
    Order,
    OrderChannel,
    OrderItem,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    ProductSourceType,
    Receipt,
    ShippingAddress,
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
DEFAULT_FREE_CITIES = (
    "dhaka",
    "gulshan",
    "banani",
    "dhanmondi",
    "mirpur",
    "uttara",
    "mohammadpur",
    "motijheel",
)


def _setting_decimal(key: str, default: Decimal) -> Decimal:
    raw = get_setting_value(key, str(default))
    try:
        return Decimal(str(raw if raw is not None else default))
    except Exception:
        return default


def free_delivery_cities() -> set[str]:
    raw = str(get_setting_value("commerce.free_delivery_cities", "") or "")
    cities = {c.strip().lower() for c in raw.split(",") if c.strip()}
    return cities or set(DEFAULT_FREE_CITIES)


def is_free_delivery_city(city: str | None) -> bool:
    if not city:
        return False
    needle = str(city).strip().lower()
    if not needle:
        return False
    for free in free_delivery_cities():
        if needle == free or free in needle or needle in free:
            return True
    return False


def commerce_rates() -> dict[str, Decimal]:
    return {
        "inside_city_shipping": _setting_decimal("commerce.inside_city_shipping", Decimal("0")),
        "outside_city_shipping": _setting_decimal(
            "commerce.outside_city_shipping", STANDARD_SHIPPING
        ),
        "free_delivery_threshold": _setting_decimal(
            "commerce.free_delivery_threshold", FREE_DELIVERY_THRESHOLD
        ),
        "tax_rate": _setting_decimal("commerce.tax_rate", TAX_RATE),
    }


def compute_order_totals(
    subtotal: Decimal,
    fulfillment_type: str,
    *,
    discount: Decimal | None = None,
    city: str | None = None,
) -> dict[str, Decimal | str | bool]:
    """
    Marketplace shipping (Daraz-style BD):
    - Store pickup: free
    - Subtotal ≥ free threshold: free nationwide
    - Inside configured metro cities: inside-city rate (default free)
    - Outside: outside-city courier charged to shopper (platform keeps fee)
    Tax applies to merchandise only (not courier), like most BD marketplaces.
    """
    rates = commerce_rates()
    discount = discount or Decimal("0.00")
    if discount < 0:
        discount = Decimal("0.00")
    if discount > subtotal:
        discount = subtotal
    taxable = subtotal - discount

    shipping_note = "free"
    if fulfillment_type == FulfillmentType.STORE_PICKUP:
        shipping = Decimal("0.00")
        shipping_note = "store_pickup"
    elif taxable >= rates["free_delivery_threshold"]:
        shipping = Decimal("0.00")
        shipping_note = "threshold"
    elif is_free_delivery_city(city):
        shipping = rates["inside_city_shipping"]
        shipping_note = "inside_city" if shipping > 0 else "inside_city_free"
    else:
        shipping = rates["outside_city_shipping"]
        shipping_note = "outside_city"

    tax = (taxable * rates["tax_rate"]).quantize(Decimal("0.01"))
    total = taxable + shipping + tax
    return {
        "shipping_fee": shipping,
        "tax": tax,
        "discount": discount,
        "total": total,
        "shipping_note": shipping_note,
        "free_delivery_city": is_free_delivery_city(city),
        "tax_rate": rates["tax_rate"],
        "free_delivery_threshold": rates["free_delivery_threshold"],
        "inside_city_shipping": rates["inside_city_shipping"],
        "outside_city_shipping": rates["outside_city_shipping"],
    }


WALLET_METHODS = {PaymentMethod.BKASH, PaymentMethod.NAGAD, PaymentMethod.MANUAL}
SELLER_INVOICE_ROLES = {"VENDOR", "VET", "BREEDER", "TRADER", "SHELTER"}


def seller_snapshot() -> dict[str, str]:
    return {
        "name": str(get_setting_value("brand.app_name", SELLER_DEFAULTS["name"]) or SELLER_DEFAULTS["name"]),
        "phone": str(get_setting_value("contact.phone", SELLER_DEFAULTS["phone"]) or SELLER_DEFAULTS["phone"]),
        "email": str(get_setting_value("contact.email", SELLER_DEFAULTS["email"]) or SELLER_DEFAULTS["email"]),
        "address": str(
            get_setting_value("contact.address", SELLER_DEFAULTS["address"]) or SELLER_DEFAULTS["address"]
        ),
    }


def issuer_seller_snapshot(user) -> dict[str, str]:
    """Brand line for invoices created by vendor / vet / live sellers."""
    platform = seller_snapshot()
    role = getattr(user, "role", None)
    email = getattr(user, "email", "") or ""
    phone = ""
    address = platform["address"]
    name = email.split("@")[0] if email else platform["name"]

    profile = getattr(user, "profile", None)
    if profile is None:
        from accounts.models import UserProfile

        profile = UserProfile.objects.filter(user_id=user.id).first()
    if profile:
        name = profile.full_name or name
        phone = profile.phone or phone
        address = profile.address or address

    if role == "VENDOR":
        from accounts.models import VendorProfile

        vp = VendorProfile.objects.filter(user_id=user.id).first()
        if vp:
            name = vp.shop_name or name
            payout = vp.payout_details or {}
            phone = payout.get("phone") or phone
            address = payout.get("address") or vp.description or address
    elif role == "VET":
        from vets.models import VetProfile

        clinic = VetProfile.objects.filter(user_id=user.id).first()
        if clinic:
            name = clinic.clinic_name or name
            address = clinic.address or address
            if clinic.city:
                address = f"{address}, {clinic.city}".strip(", ")

    return {
        "name": name or platform["name"],
        "phone": phone or platform["phone"],
        "email": email or platform["email"],
        "address": address or platform["address"],
    }


def parse_issued_at(value) -> timezone.datetime:
    if value is None or value == "":
        return timezone.now()
    if isinstance(value, timezone.datetime):
        dt = value
    else:
        raw = str(value).strip()
        # Accept date-only (YYYY-MM-DD) or ISO datetime
        try:
            if len(raw) <= 10:
                from datetime import date, datetime

                d = date.fromisoformat(raw[:10])
                dt = timezone.make_aware(datetime(d.year, d.month, d.day, 12, 0, 0))
            else:
                from django.utils.dateparse import parse_datetime

                dt = parse_datetime(raw) or timezone.now()
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
        except Exception:
            dt = timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt


def _extract_sequence_value(number: str, prefix: str, year: int) -> int | None:
    """Parse KS-INV-2026-00042 → 42 (also tolerates legacy order-id padded forms)."""
    if not number:
        return None
    parts = number.split("-")
    if len(parts) < 3:
        return None
    try:
        # KS-INV-2026-00042
        if parts[-2].isdigit() and int(parts[-2]) == year and parts[-1].isdigit():
            return int(parts[-1])
        if parts[-1].isdigit():
            return int(parts[-1])
    except Exception:
        return None
    return None


@transaction.atomic
def allocate_doc_number(prefix: str, *, year: int | None = None) -> str:
    """Next shared document number for online + manual invoices/receipts."""
    year = year or timezone.now().year
    seq, _ = DocumentSequence.objects.select_for_update().get_or_create(
        prefix=prefix,
        year=year,
        defaults={"last_value": 0},
    )
    if seq.last_value == 0:
        # Seed from existing docs so we never collide with legacy order-id numbers
        Model = Invoice if prefix == "KS-INV" else Receipt
        max_n = 0
        for num in Model.objects.filter(number__startswith=f"{prefix}-{year}-").values_list(
            "number", flat=True
        ):
            parsed = _extract_sequence_value(num, prefix, year)
            if parsed and parsed > max_n:
                max_n = parsed
        seq.last_value = max_n
    seq.last_value += 1
    seq.save(update_fields=["last_value"])
    return f"{prefix}-{year}-{seq.last_value:05d}"


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
        "sslcommerz": PaymentMethod.SSLCOMMERZ,
        "ssl": PaymentMethod.SSLCOMMERZ,
        "card": PaymentMethod.SSLCOMMERZ,
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


def payment_instructions(method: str) -> dict:
    seller = seller_snapshot()
    bkash = str(get_setting_value("commerce.bkash_number", "+880 1898-941782") or "+880 1898-941782")
    nagad = str(get_setting_value("commerce.nagad_number", "+880 1898-941782") or "+880 1898-941782")
    pickup = str(get_setting_value("commerce.pickup_address", seller["address"]) or seller["address"])

    if method == PaymentMethod.SSLCOMMERZ:
        return {
            "title": "Card / mobile banking (SSLCommerz)",
            "steps": [
                "Complete payment on the secure SSLCommerz page.",
                "You will return to the order confirmation once the bank confirms payment.",
                "Your receipt is marked paid automatically after verification.",
            ],
        }
    if method == PaymentMethod.COD:
        return {
            "title": "Cash on Delivery",
            "steps": [
                "Your order receipt is reserved. Pay cash when the parcel arrives.",
                "Our courier may call the phone on your order before delivery.",
                "Your receipt is marked paid after collection is confirmed.",
            ],
        }
    if method == PaymentMethod.BKASH:
        return {
            "title": "bKash payment",
            "wallet_number": bkash,
            "steps": [
                f"Send the order total to bKash {bkash} (Payment / Send Money).",
                "Use your order number as the reference.",
                "Submit the Txn ID if you have not already — our team will verify and approve.",
                "Your receipt is marked paid after approval.",
            ],
        }
    if method == PaymentMethod.NAGAD:
        return {
            "title": "Nagad payment",
            "wallet_number": nagad,
            "steps": [
                f"Send the order total to Nagad {nagad}.",
                "Use your order number as the reference.",
                "Keep the Txn ID ready — admin verifies before packing.",
                "Your receipt is marked paid after approval.",
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
                "Receipt is marked paid when pickup payment is confirmed.",
            ],
        }
    return {
        "title": "Manual payment",
        "steps": [
            "Follow the payment instructions for your order total.",
            "Share the transaction reference with support for approval.",
        ],
    }


def _next_doc_number(prefix: str, order_id: int | None = None) -> str:
    """Allocate next number in the shared yearly sequence (online + manual)."""
    return allocate_doc_number(prefix)


@transaction.atomic
def create_invoice_and_receipt(
    order: Order,
    payment: Payment,
    *,
    seller: dict[str, str] | None = None,
    issued_at=None,
    notes: str | None = None,
) -> tuple[Invoice, Receipt]:
    seller = seller or seller_snapshot()
    issued = parse_issued_at(issued_at) if issued_at is not None else timezone.now()
    default_notes = notes
    if default_notes is None:
        if getattr(order, "channel", None) == OrderChannel.MANUAL:
            default_notes = "Manual sale invoice — printable for customer & records."
        else:
            default_notes = (
                "Fulfillment invoice — auto-created for packing; shared by admin and vendors."
            )

    invoice, _ = Invoice.objects.get_or_create(
        order=order,
        defaults={
            "number": allocate_doc_number("KS-INV"),
            "status": DocumentStatus.AWAITING_PAYMENT,
            "issued_at": issued,
            "seller_name": seller["name"],
            "seller_phone": seller["phone"],
            "seller_email": seller["email"],
            "seller_address": seller["address"],
            "notes": default_notes,
        },
    )
    receipt, _ = Receipt.objects.get_or_create(
        order=order,
        defaults={
            "invoice": invoice,
            "payment": payment,
            "number": allocate_doc_number("KS-RCP"),
            "status": DocumentStatus.AWAITING_PAYMENT,
            "issued_at": issued,
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


def _line_items_from_payload(items: list[dict]) -> list[dict]:
    lines = []
    for raw in items or []:
        title = (raw.get("title") or raw.get("title_snapshot") or "").strip()
        if not title:
            continue
        qty = int(raw.get("qty") or 1)
        if qty < 1:
            qty = 1
        price = Decimal(str(raw.get("price") or raw.get("price_snapshot") or 0))
        if price < 0:
            price = Decimal("0")
        lines.append(
            {
                "title_snapshot": title[:255],
                "qty": qty,
                "price_snapshot": price,
                "line_subtotal": (price * qty).quantize(Decimal("0.01")),
            }
        )
    return lines


@transaction.atomic
def create_manual_invoice(*, issuer, data: dict) -> Order:
    """Seller-issued invoice (vendor / vet / live sellers). Shoppers do not create these."""
    from shop.services.commission import calculate_manual_vendor_fees

    lines = _line_items_from_payload(data.get("items") or [])
    if not lines:
        raise ValueError("At least one line item is required")

    subtotal = sum((ln["line_subtotal"] for ln in lines), Decimal("0"))
    discount = Decimal(str(data.get("discount") or 0))
    shipping = Decimal(str(data.get("shipping_fee") or 0))
    tax = Decimal(str(data.get("tax") or 0))
    if discount < 0:
        discount = Decimal("0")
    if shipping < 0:
        shipping = Decimal("0")
    if tax < 0:
        tax = Decimal("0")
    total = (subtotal + shipping + tax - discount).quantize(Decimal("0.01"))
    if total < 0:
        total = Decimal("0")

    customer = data.get("customer") or {}
    name = (customer.get("name") or "").strip() or "Customer"
    phone = (customer.get("phone") or "").strip() or "—"
    address = (customer.get("address") or "").strip() or "—"
    city = (customer.get("city") or "").strip() or "—"
    country = (customer.get("country") or "").strip() or "Bangladesh"
    notes = (customer.get("notes") or data.get("customer_notes") or "") or None
    guest_email = (customer.get("email") or data.get("guest_email") or "").strip() or None

    paid = bool(data.get("mark_paid") or data.get("paid"))
    issued_at = parse_issued_at(data.get("issued_at") or data.get("invoice_date"))
    seller_override = data.get("seller") or {}
    seller = issuer_seller_snapshot(issuer)
    for key in ("name", "phone", "email", "address"):
        if seller_override.get(key):
            seller[key] = str(seller_override[key]).strip()

    method = resolve_payment_method(data.get("payment_method") or PaymentMethod.MANUAL)
    fulfillment = data.get("fulfillment_type") or fulfillment_for_method(method)
    from accounts.services.sellers import is_marketplace_seller

    is_seller = is_marketplace_seller(issuer)
    seller_id = issuer.id if is_seller else None

    order = Order.objects.create(
        user=None,
        guest_email=guest_email,
        status=OrderStatus.PAID if paid else OrderStatus.PENDING,
        fulfillment_type=fulfillment,
        channel=OrderChannel.MANUAL,
        issuer=issuer,
        track_token=make_track_token(),
        subtotal=subtotal,
        discount=discount,
        shipping_fee=shipping,
        tax=tax,
        total=total,
        currency=(data.get("currency") or "BDT")[:3],
    )

    for ln in lines:
        fees = calculate_manual_vendor_fees(
            unit_price=ln["price_snapshot"],
            qty=ln["qty"],
            vendor_id=seller_id,
        )
        OrderItem.objects.create(
            order=order,
            variant=None,
            vendor=issuer if is_seller else None,
            source_type=(
                ProductSourceType.VENDOR if is_seller else ProductSourceType.PLATFORM_OWN
            ),
            title_snapshot=ln["title_snapshot"],
            price_snapshot=ln["price_snapshot"],
            qty=ln["qty"],
            line_subtotal=ln["line_subtotal"],
            commission_rate=fees["commission_rate"],
            platform_fee=fees["platform_fee"],
            payment_processing_fee=fees["payment_processing_fee"],
            vendor_earnings=fees["vendor_earnings"] if is_seller else Decimal("0"),
            platform_revenue=fees["platform_revenue"] if is_seller else ln["line_subtotal"],
        )

    ShippingAddress.objects.create(
        order=order,
        name=name,
        phone=phone,
        address=address,
        city=city,
        country=country,
        notes=notes,
    )

    payment = Payment.objects.create(
        order=order,
        method=method,
        status=PaymentStatus.COMPLETED if paid else PaymentStatus.PENDING,
        amount=total,
        reference=data.get("payment_reference") or f"manual:{order.id}",
        approved_at=issued_at if paid else None,
        approved_by=issuer if paid else None,
    )

    invoice, receipt = create_invoice_and_receipt(
        order,
        payment,
        seller=seller,
        issued_at=issued_at,
        notes=data.get("notes"),
    )

    if paid:
        invoice.status = DocumentStatus.PAID
        invoice.save(update_fields=["status", "updated_at"])
        receipt.status = DocumentStatus.PAID
        receipt.paid_at = issued_at
        receipt.save(update_fields=["status", "paid_at", "updated_at"])
        if is_seller:
            from shop.services.commission import record_vendor_ledger_for_order

            record_vendor_ledger_for_order(order)

    return order


@transaction.atomic
def update_manual_invoice(order: Order, *, issuer, data: dict) -> Order:
    from shop.services.commission import calculate_manual_vendor_fees

    if order.channel != OrderChannel.MANUAL or order.issuer_id != issuer.id:
        raise PermissionError("Not allowed to edit this invoice")

    payment = order.payments.order_by("id").first()
    payment_done = bool(payment and payment.status == PaymentStatus.COMPLETED)
    if payment_done:
        # Marketplace rule: paid documents are locked (Shopify / Daraz style)
        locked_keys = {"items", "issued_at", "invoice_date", "discount", "shipping_fee", "tax"}
        if any(k in data for k in locked_keys):
            raise ValueError("Paid invoices cannot change date, line items, or totals")

    customer = data.get("customer")
    if customer is not None and not payment_done:
        ship = ShippingAddress.objects.filter(order_id=order.id).first()
        if ship:
            if "name" in customer:
                ship.name = (customer.get("name") or ship.name).strip() or ship.name
            if "phone" in customer:
                ship.phone = (customer.get("phone") or ship.phone).strip() or ship.phone
            if "address" in customer:
                ship.address = (customer.get("address") or ship.address).strip() or ship.address
            if "city" in customer:
                ship.city = (customer.get("city") or ship.city).strip() or ship.city
            if "country" in customer:
                ship.country = (customer.get("country") or ship.country).strip() or ship.country
            if "notes" in customer:
                ship.notes = customer.get("notes") or None
            if "email" in customer:
                order.guest_email = (customer.get("email") or "").strip() or None
            ship.save()

    from accounts.services.sellers import is_marketplace_seller

    is_seller = is_marketplace_seller(issuer)
    seller_id = issuer.id if is_seller else None

    if "items" in data and not payment_done:
        lines = _line_items_from_payload(data.get("items") or [])
        if not lines:
            raise ValueError("At least one line item is required")
        OrderItem.objects.filter(order_id=order.id).delete()
        for ln in lines:
            fees = calculate_manual_vendor_fees(
                unit_price=ln["price_snapshot"],
                qty=ln["qty"],
                vendor_id=seller_id,
            )
            OrderItem.objects.create(
                order=order,
                variant=None,
                vendor=issuer if is_seller else None,
                source_type=(
                    ProductSourceType.VENDOR if is_seller else ProductSourceType.PLATFORM_OWN
                ),
                title_snapshot=ln["title_snapshot"],
                price_snapshot=ln["price_snapshot"],
                qty=ln["qty"],
                line_subtotal=ln["line_subtotal"],
                commission_rate=fees["commission_rate"],
                platform_fee=fees["platform_fee"],
                payment_processing_fee=fees["payment_processing_fee"],
                vendor_earnings=fees["vendor_earnings"] if is_seller else Decimal("0"),
                platform_revenue=fees["platform_revenue"] if is_seller else ln["line_subtotal"],
            )
        order.subtotal = sum((ln["line_subtotal"] for ln in lines), Decimal("0"))

    if not payment_done:
        for field, cast in (
            ("discount", Decimal),
            ("shipping_fee", Decimal),
            ("tax", Decimal),
        ):
            if field in data and data[field] is not None:
                value = cast(str(data[field]))
                if value < 0:
                    value = Decimal("0")
                setattr(order, field, value)

        order.total = (
            order.subtotal + order.shipping_fee + order.tax - order.discount
        ).quantize(Decimal("0.01"))
        if order.total < 0:
            order.total = Decimal("0")
        order.save()

        if payment:
            payment.amount = order.total
            if "payment_method" in data and data["payment_method"]:
                payment.method = resolve_payment_method(data["payment_method"])
            payment.save()

    invoice = Invoice.objects.filter(order_id=order.id).first()
    receipt = Receipt.objects.filter(order_id=order.id).first()
    issued_at = None
    if not payment_done and (data.get("issued_at") or data.get("invoice_date")):
        issued_at = parse_issued_at(data.get("issued_at") or data.get("invoice_date"))

    seller_override = data.get("seller") or {}
    if invoice:
        if issued_at:
            invoice.issued_at = issued_at
        if "notes" in data:
            invoice.notes = data.get("notes")
        for key, attr in (
            ("name", "seller_name"),
            ("phone", "seller_phone"),
            ("email", "seller_email"),
            ("address", "seller_address"),
        ):
            if seller_override.get(key) is not None:
                setattr(invoice, attr, str(seller_override[key]).strip())
        invoice.save()

    if receipt:
        if issued_at:
            receipt.issued_at = issued_at
        receipt.amount = order.total
        for key, attr in (
            ("name", "seller_name"),
            ("phone", "seller_phone"),
            ("email", "seller_email"),
            ("address", "seller_address"),
        ):
            if seller_override.get(key) is not None:
                setattr(receipt, attr, str(seller_override[key]).strip())
        receipt.save()

    if data.get("mark_paid") and not payment_done:
        mark_manual_paid(order, issuer=issuer)

    return order


@transaction.atomic
def mark_manual_paid(order: Order, *, issuer) -> Order:
    payment = order.payments.order_by("id").first()
    if not payment:
        raise ValueError("Payment missing")
    now = timezone.now()
    payment.status = PaymentStatus.COMPLETED
    payment.approved_at = now
    payment.approved_by = issuer
    payment.amount = order.total
    payment.save()
    order.status = OrderStatus.PAID
    order.save(update_fields=["status", "updated_at"])
    invoice = Invoice.objects.filter(order_id=order.id).first()
    receipt = Receipt.objects.filter(order_id=order.id).first()
    if invoice:
        invoice.status = DocumentStatus.PAID
        invoice.save(update_fields=["status", "updated_at"])
    if receipt:
        receipt.status = DocumentStatus.PAID
        receipt.paid_at = now
        receipt.amount = order.total
        receipt.save(update_fields=["status", "paid_at", "amount", "updated_at"])

    # Same settlement path as checkout: commission → vendor ledger, remainder to vendor
    from shop.services.commission import record_vendor_ledger_for_order
    from shop.services.finance import sync_platform_ledger_for_order

    record_vendor_ledger_for_order(order)
    sync_platform_ledger_for_order(order)
    return order


def ensure_documents_for_order(order: Order) -> tuple[Invoice, Receipt] | None:
    """Create invoice/receipt when an order has payment but missing documents."""
    payment = order.payments.order_by("id").first()
    if not payment:
        return None
    invoice, receipt = create_invoice_and_receipt(order, payment)
    if payment.status == PaymentStatus.COMPLETED:
        if invoice.status != DocumentStatus.PAID:
            invoice.status = DocumentStatus.PAID
            invoice.notes = invoice.notes or "Payment approved."
            invoice.save(update_fields=["status", "notes", "updated_at"])
        if receipt.status != DocumentStatus.PAID:
            receipt.status = DocumentStatus.PAID
            receipt.paid_at = receipt.paid_at or payment.approved_at or timezone.now()
            receipt.amount = payment.amount or order.total
            receipt.save(update_fields=["status", "paid_at", "amount", "updated_at"])
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

    # Accrue vendor earnings only after money is confirmed
    from shop.services.commission import record_vendor_ledger_for_order
    from shop.services.finance import sync_platform_ledger_for_order
    from shop.services.fulfillment import ensure_shipments_for_order

    record_vendor_ledger_for_order(order)
    sync_platform_ledger_for_order(order)
    ensure_shipments_for_order(order)

    try:
        from shop.services.notify import notify_payment_approved

        notify_payment_approved(order)
    except Exception:
        pass

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


def _payment_confirmed(order: Order, payment: Payment | None = None) -> bool:
    """True when money is confirmed for customer tracking / receipt UI."""
    payment = payment or order.payments.order_by("id").first()
    if payment and payment.status == PaymentStatus.COMPLETED:
        return True
    # Admin may have marked docs/order paid without going through approve_payment yet.
    if order.status == OrderStatus.PAID:
        return True
    if Receipt.objects.filter(order_id=order.id, status=DocumentStatus.PAID).exists():
        return True
    if Invoice.objects.filter(order_id=order.id, status=DocumentStatus.PAID).exists():
        return True
    return False


def _payment_step_detail(order: Order, payment: Payment | None, payment_done: bool) -> str:
    if payment_done:
        return "Confirmed"
    method = (payment.method if payment else "") or ""
    if method == PaymentMethod.COD:
        return "Pay on delivery"
    if method == PaymentMethod.STORE_PICKUP:
        return "Pay at store"
    return "Awaiting approval"


def order_timeline(order: Order) -> list[dict]:
    """Customer-facing tracker steps (Daraz / Shopify style)."""
    payment = order.payments.order_by("id").first()
    payment_done = _payment_confirmed(order, payment)
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
            "detail": _payment_step_detail(order, payment, bool(payment_done)),
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
