"""Generate simple PDF invoice / receipt documents with reportlab."""

from __future__ import annotations

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from shop.models import Invoice, OrderItem, Receipt, ShippingAddress
from shop.services.invoicing import seller_snapshot


def _money(currency: str, value) -> str:
    try:
        return f"{currency} {float(value):,.2f}"
    except (TypeError, ValueError):
        return f"{currency} {value}"


def build_order_pdf(order, *, mode: str = "receipt") -> bytes:
    """mode: 'receipt' | 'invoice'"""
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)
    styles = getSampleStyleSheet()
    story = []

    seller = seller_snapshot()
    if mode == "invoice":
        record = Invoice.objects.filter(order_id=order.id).first()
        title = "Packing Invoice"
        number = record.number if record else order.public_order_number
        if record:
            seller = {
                "name": record.seller_name,
                "phone": record.seller_phone,
                "email": record.seller_email,
                "address": record.seller_address,
            }
    else:
        record = Receipt.objects.filter(order_id=order.id).first()
        title = "Customer Receipt"
        number = record.number if record else order.public_order_number

    story.append(Paragraph(f"<b>{seller.get('name') or 'Kedi Smart'}</b>", styles["Title"]))
    story.append(Paragraph(title, styles["Heading2"]))
    story.append(Paragraph(f"Document: <b>{number}</b>", styles["Normal"]))
    story.append(Paragraph(f"Order: <b>{order.public_order_number}</b> · Status: {order.status}", styles["Normal"]))
    story.append(Spacer(1, 8))

    shipping = ShippingAddress.objects.filter(order_id=order.id).first()
    if shipping:
        story.append(Paragraph("<b>Bill / Ship to</b>", styles["Heading4"]))
        story.append(
            Paragraph(
                f"{shipping.name}<br/>{shipping.phone}<br/>{shipping.address}, {shipping.city}, {shipping.country}",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 8))

    items = OrderItem.objects.filter(order_id=order.id)
    rows = [["Item", "Qty", "Unit", "Line"]]
    for item in items:
        rows.append(
            [
                item.title_snapshot[:48],
                str(item.qty),
                _money(order.currency, item.price_snapshot),
                _money(order.currency, item.line_subtotal),
            ]
        )
    table = Table(rows, colWidths=[90 * mm, 20 * mm, 30 * mm, 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d1d5db")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 10))

    totals = [
        f"Subtotal: {_money(order.currency, order.subtotal)}",
        f"Discount: {_money(order.currency, order.discount)}",
        f"Shipping: {_money(order.currency, order.shipping_fee)}",
        f"Tax: {_money(order.currency, order.tax)}",
        f"<b>Total: {_money(order.currency, order.total)}</b>",
    ]
    if order.coupon_code:
        totals.insert(1, f"Coupon: {order.coupon_code}")
    for line in totals:
        story.append(Paragraph(line, styles["Normal"]))

    story.append(Spacer(1, 12))
    story.append(
        Paragraph(
            f"{seller.get('address') or ''}<br/>{seller.get('phone') or ''} · {seller.get('email') or ''}",
            styles["Normal"],
        )
    )
    doc.build(story)
    return buf.getvalue()
