"""Professional PDF documents for Kedi Smart commerce & accounting.

Supported kinds:
  invoice | receipt | bill | voucher | expense_voucher | income_voucher
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from io import BytesIO
from typing import Any, Literal

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from shop.models import Invoice, OrderItem, Payment, Receipt, ShippingAddress
from shop.services.invoicing import seller_snapshot

DocumentKind = Literal[
    "invoice",
    "receipt",
    "bill",
    "voucher",
    "expense_voucher",
    "income_voucher",
]

# Brand palette (aligned with storefront / OrderDocument)
ACCENT = colors.HexColor("#f26522")
INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#cbd5e1")
HEADER_BG = colors.HexColor("#f1f5f9")  # light, toner-friendly table header
HEADER_LINE = colors.HexColor("#94a3b8")
ROW_ALT = colors.HexColor("#f8fafc")
SOFT = colors.HexColor("#fff7ed")
WHITE = colors.white

DOC_TITLES: dict[str, str] = {
    "invoice": "INVOICE",
    "receipt": "RECEIPT",
    "bill": "BILL",
    "voucher": "VOUCHER",
    "expense_voucher": "EXPENSE VOUCHER",
    "income_voucher": "INCOME VOUCHER",
}

DOC_SUBTITLES: dict[str, str] = {
    "invoice": "Packing / commercial invoice · Shared with platform owner",
    "receipt": "Customer payment receipt",
    "bill": "Commercial bill",
    "voucher": "Accounting voucher",
    "expense_voucher": "Expense payment voucher",
    "income_voucher": "Income receipt voucher",
}


@dataclass
class DocParty:
    label: str
    name: str = ""
    lines: list[str] = field(default_factory=list)


@dataclass
class DocLine:
    description: str
    qty: str | float | int = "1"
    unit: str = ""
    amount: str = ""


@dataclass
class DocTotal:
    label: str
    value: str
    emphasize: bool = False


@dataclass
class DocumentSpec:
    kind: DocumentKind
    number: str
    issued_at: str
    currency: str = "BDT"
    status: str = ""
    reference: str = ""
    issuer: DocParty | None = None
    party: DocParty | None = None
    meta: list[tuple[str, str]] = field(default_factory=list)
    lines: list[DocLine] = field(default_factory=list)
    totals: list[DocTotal] = field(default_factory=list)
    notes: str = ""
    payment_method: str = ""
    payment_ref: str = ""
    footer: str = "Kedi Smart · Thank you for your business."


def _money(currency: str, value: Any) -> str:
    try:
        return f"{currency} {float(value):,.2f}"
    except (TypeError, ValueError):
        return f"{currency} {value}"


def _fmt_date(value) -> str:
    if value is None:
        return "—"
    if isinstance(value, datetime):
        return value.strftime("%d %b %Y")
    text = str(value)
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).strftime("%d %b %Y")
    except ValueError:
        return text[:10] if text else "—"


def _styles():
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "DocBrand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=INK,
            leading=18,
            spaceAfter=2,
        ),
        "brand_meta": ParagraphStyle(
            "DocBrandMeta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            leading=11,
        ),
        "doc_title": ParagraphStyle(
            "DocTitle",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=INK,
            alignment=TA_RIGHT,
            leading=22,
        ),
        "doc_number": ParagraphStyle(
            "DocNumber",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=ACCENT,
            alignment=TA_RIGHT,
            leading=13,
            spaceBefore=2,
        ),
        "subtitle": ParagraphStyle(
            "DocSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            leading=11,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "DocSection",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            textColor=MUTED,
            leading=10,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "DocBody",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=INK,
            leading=12,
        ),
        "body_bold": ParagraphStyle(
            "DocBodyBold",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=INK,
            leading=13,
        ),
        "small": ParagraphStyle(
            "DocSmall",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            textColor=MUTED,
            leading=11,
        ),
        "cell": ParagraphStyle(
            "DocCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=INK,
            leading=11,
        ),
        "cell_right": ParagraphStyle(
            "DocCellRight",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=INK,
            leading=11,
            alignment=TA_RIGHT,
        ),
        "th": ParagraphStyle(
            "DocTh",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=INK,
            leading=10,
        ),
        "th_right": ParagraphStyle(
            "DocThRight",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=INK,
            leading=10,
            alignment=TA_RIGHT,
        ),
        "total_label": ParagraphStyle(
            "DocTotalLabel",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=MUTED,
            alignment=TA_RIGHT,
            leading=12,
        ),
        "total_value": ParagraphStyle(
            "DocTotalValue",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            textColor=INK,
            alignment=TA_RIGHT,
            leading=12,
        ),
        "total_emph_label": ParagraphStyle(
            "DocTotalEmphLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=INK,
            alignment=TA_RIGHT,
            leading=13,
        ),
        "total_emph_value": ParagraphStyle(
            "DocTotalEmphValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=ACCENT,
            alignment=TA_RIGHT,
            leading=13,
        ),
        "footer": ParagraphStyle(
            "DocFooter",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            textColor=MUTED,
            leading=10,
            alignment=TA_LEFT,
        ),
    }


def _party_block(party: DocParty | None, styles) -> list:
    if not party:
        return [Paragraph("&nbsp;", styles["body"])]
    bits = [Paragraph(party.label.upper(), styles["section"])]
    if party.name:
        bits.append(Paragraph(party.name, styles["body_bold"]))
    for line in party.lines:
        if line:
            bits.append(Paragraph(str(line), styles["small"]))
    return bits


def _meta_block(spec: DocumentSpec, styles) -> list:
    rows = []
    meta = list(spec.meta)
    if spec.status:
        meta.append(("Status", spec.status.replace("_", " ").title()))
    if spec.payment_method:
        meta.append(("Payment", spec.payment_method))
    if spec.payment_ref:
        meta.append(("Reference", spec.payment_ref))
    for label, value in meta:
        rows.append(
            [
                Paragraph(str(label), styles["small"]),
                Paragraph(str(value or "—"), styles["body"]),
            ]
        )
    if not rows:
        rows = [[Paragraph("Date", styles["small"]), Paragraph(spec.issued_at, styles["body"])]]
    table = Table(rows, colWidths=[28 * mm, 52 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    return [Paragraph("DOCUMENT DETAILS", styles["section"]), table]


def build_document_pdf(spec: DocumentSpec) -> bytes:
    """Render any commercial / accounting document with one professional layout."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=f"{DOC_TITLES.get(spec.kind, 'DOCUMENT')} {spec.number}",
        author=(spec.issuer.name if spec.issuer else "Kedi Smart"),
    )
    styles = _styles()
    story: list = []
    page_width = A4[0] - 28 * mm

    # Accent bar
    story.append(
        Table(
            [[""]],
            colWidths=[page_width],
            rowHeights=[3.2],
        )
    )
    story[-1].setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)]))
    story.append(Spacer(1, 8))

    # Header: issuer | title
    issuer_lines = []
    if spec.issuer:
        issuer_lines.append(Paragraph(spec.issuer.name or "Kedi Smart", styles["brand"]))
        for line in spec.issuer.lines:
            if line:
                issuer_lines.append(Paragraph(str(line), styles["brand_meta"]))
    else:
        issuer_lines.append(Paragraph("Kedi Smart", styles["brand"]))

    title_block = [
        Paragraph(DOC_TITLES.get(spec.kind, "DOCUMENT"), styles["doc_title"]),
        Paragraph(spec.number, styles["doc_number"]),
        Paragraph(f"Date: {spec.issued_at}", styles["small"]),
    ]
    header = Table(
        [[issuer_lines, title_block]],
        colWidths=[page_width * 0.58, page_width * 0.42],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(header)
    story.append(Paragraph(DOC_SUBTITLES.get(spec.kind, ""), styles["subtitle"]))
    story.append(
        HRFlowable(width="100%", thickness=0.6, color=LINE, spaceBefore=0, spaceAfter=10)
    )

    # Parties + meta
    left = _party_block(spec.party, styles)
    right = _meta_block(spec, styles)
    parties = Table([[left, right]], colWidths=[page_width * 0.55, page_width * 0.45])
    parties.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (0, 0), ROW_ALT),
                ("BACKGROUND", (1, 0), (1, 0), SOFT),
                ("BOX", (0, 0), (0, 0), 0.4, LINE),
                ("BOX", (1, 0), (1, 0), 0.4, colors.HexColor("#fed7aa")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(parties)
    story.append(Spacer(1, 12))

    # Line items table
    item_rows = [
        [
            Paragraph("#", styles["th"]),
            Paragraph("Description", styles["th"]),
            Paragraph("Qty", styles["th_right"]),
            Paragraph("Unit price", styles["th_right"]),
            Paragraph("Amount", styles["th_right"]),
        ]
    ]
    if spec.lines:
        for idx, line in enumerate(spec.lines, start=1):
            item_rows.append(
                [
                    Paragraph(str(idx), styles["cell"]),
                    Paragraph(str(line.description or "—"), styles["cell"]),
                    Paragraph(str(line.qty), styles["cell_right"]),
                    Paragraph(str(line.unit or "—"), styles["cell_right"]),
                    Paragraph(str(line.amount or "—"), styles["cell_right"]),
                ]
            )
    else:
        item_rows.append(
            [
                Paragraph("—", styles["cell"]),
                Paragraph("No line items", styles["cell"]),
                Paragraph("—", styles["cell_right"]),
                Paragraph("—", styles["cell_right"]),
                Paragraph("—", styles["cell_right"]),
            ]
        )

    items_table = Table(
        item_rows,
        colWidths=[10 * mm, 88 * mm, 18 * mm, 32 * mm, 34 * mm],
        repeatRows=1,
    )
    item_style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("LINEBELOW", (0, 0), (-1, 0), 1.0, HEADER_LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
    ]
    for i in range(1, len(item_rows)):
        if i % 2 == 0:
            item_style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    items_table.setStyle(TableStyle(item_style))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # Totals table (right aligned)
    total_rows = []
    for total in spec.totals:
        if total.emphasize:
            total_rows.append(
                [
                    Paragraph(total.label, styles["total_emph_label"]),
                    Paragraph(total.value, styles["total_emph_value"]),
                ]
            )
        else:
            total_rows.append(
                [
                    Paragraph(total.label, styles["total_label"]),
                    Paragraph(total.value, styles["total_value"]),
                ]
            )
    if total_rows:
        totals_table = Table(total_rows, colWidths=[40 * mm, 38 * mm], hAlign="RIGHT")
        totals_style = [
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LINEABOVE", (0, -1), (-1, -1), 1.1, INK),
            ("BACKGROUND", (0, -1), (-1, -1), SOFT),
            ("TOPPADDING", (0, -1), (-1, -1), 6),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 6),
        ]
        totals_table.setStyle(TableStyle(totals_style))
        story.append(totals_table)

    if spec.notes:
        story.append(Spacer(1, 12))
        notes_block = KeepTogether(
            [
                Paragraph("NOTES", styles["section"]),
                Paragraph(spec.notes.replace("\n", "<br/>"), styles["small"]),
            ]
        )
        story.append(notes_block)

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceBefore=0, spaceAfter=6))
    story.append(Paragraph(spec.footer, styles["footer"]))
    if spec.reference:
        story.append(Paragraph(f"Internal ref: {spec.reference}", styles["footer"]))

    doc.build(story)
    return buf.getvalue()


def _order_payment(order) -> Payment | None:
    return order.payments.order_by("id").first()


def _payment_label(payment: Payment | None) -> str:
    if not payment:
        return "—"
    try:
        return payment.get_method_display()
    except Exception:
        return str(payment.method or "—")


def build_order_pdf(order, *, mode: str = "receipt") -> bytes:
    """Build invoice / receipt / bill PDF for a shop order."""
    kind: DocumentKind
    if mode in ("invoice", "receipt", "bill"):
        kind = mode  # type: ignore[assignment]
    else:
        kind = "receipt"

    currency = order.currency or "BDT"
    payment = _order_payment(order)
    shipping = ShippingAddress.objects.filter(order_id=order.id).first()
    invoice = Invoice.objects.filter(order_id=order.id).first()
    receipt = Receipt.objects.filter(order_id=order.id).first()

    platform = seller_snapshot()
    if kind in ("invoice", "bill") and invoice:
        issuer = DocParty(
            label="From",
            name=invoice.seller_name or platform["name"],
            lines=[
                invoice.seller_address or platform["address"],
                " · ".join(
                    p
                    for p in (
                        invoice.seller_phone or platform["phone"],
                        invoice.seller_email or platform["email"],
                    )
                    if p
                ),
            ],
        )
        number = invoice.number
        issued = _fmt_date(invoice.issued_at)
        status = invoice.status
        notes = invoice.notes or ""
    elif receipt:
        issuer = DocParty(
            label="From",
            name=receipt.seller_name or platform["name"],
            lines=[
                receipt.seller_address or platform["address"],
                " · ".join(
                    p
                    for p in (
                        receipt.seller_phone or platform["phone"],
                        receipt.seller_email or platform["email"],
                    )
                    if p
                ),
            ],
        )
        number = receipt.number
        issued = _fmt_date(receipt.paid_at or receipt.issued_at)
        status = receipt.status
        notes = ""
    else:
        issuer = DocParty(
            label="From",
            name=platform["name"],
            lines=[platform["address"], f"{platform['phone']} · {platform['email']}"],
        )
        number = order.public_order_number
        issued = _fmt_date(order.created_at)
        status = order.status
        notes = ""

    party_lines = []
    if shipping:
        if shipping.phone:
            party_lines.append(shipping.phone)
        addr = ", ".join(p for p in (shipping.address, shipping.city, shipping.country) if p)
        if addr:
            party_lines.append(addr)
        if shipping.notes:
            party_lines.append(f"Note: {shipping.notes}")
    party = DocParty(
        label="Bill / ship to" if kind != "receipt" else "Received from",
        name=(shipping.name if shipping and shipping.name else None)
        or (order.user.email if getattr(order, "user_id", None) else None)
        or order.guest_email
        or "Customer",
        lines=party_lines,
    )

    lines = [
        DocLine(
            description=item.title_snapshot,
            qty=item.qty,
            unit=_money(currency, item.price_snapshot),
            amount=_money(currency, item.line_subtotal),
        )
        for item in OrderItem.objects.filter(order_id=order.id)
    ]

    shipping_label = "Pickup fee" if order.fulfillment_type == "store_pickup" else "Shipping"
    totals = [
        DocTotal("Subtotal", _money(currency, order.subtotal)),
    ]
    if order.discount and float(order.discount) != 0:
        label = f"Discount ({order.coupon_code})" if order.coupon_code else "Discount"
        totals.append(DocTotal(label, f"- {_money(currency, order.discount)}"))
    totals.append(DocTotal(shipping_label, _money(currency, order.shipping_fee)))
    if order.tax and float(order.tax) != 0:
        totals.append(DocTotal("Tax", _money(currency, order.tax)))
    totals.append(DocTotal("Total", _money(currency, order.total), emphasize=True))

    payment_ref = ""
    if payment:
        payment_ref = payment.wallet_txn_id or payment.reference or payment.gateway_tran_id or ""

    spec = DocumentSpec(
        kind=kind,
        number=number,
        issued_at=issued,
        currency=currency,
        status=status,
        reference=order.public_order_number,
        issuer=issuer,
        party=party,
        meta=[
            ("Order", order.public_order_number),
            ("Issued", issued),
            (
                "Fulfillment",
                "Store pickup" if order.fulfillment_type == "store_pickup" else "Home delivery",
            ),
        ],
        lines=lines,
        totals=totals,
        notes=notes or "",
        payment_method=_payment_label(payment),
        payment_ref=str(payment_ref or ""),
        footer="Kedi Smart marketplace · Document shared with platform owner & seller records.",
    )
    return build_document_pdf(spec)


def build_voucher_pdf(
    *,
    kind: DocumentKind = "voucher",
    number: str,
    issued_at: str | datetime | None = None,
    currency: str = "BDT",
    status: str = "",
    issuer_name: str = "",
    issuer_lines: list[str] | None = None,
    party_name: str = "",
    party_lines: list[str] | None = None,
    lines: list[dict] | None = None,
    totals: list[dict] | None = None,
    amount: Any = None,
    narration: str = "",
    payment_method: str = "",
    payment_ref: str = "",
    reference: str = "",
) -> bytes:
    """Build expense / income / general accounting voucher PDFs.

    Accepts a flexible payload so sellers & admin can generate vouchers even before
    a dedicated voucher model is persisted.
    """
    if kind not in ("voucher", "expense_voucher", "income_voucher"):
        kind = "voucher"

    platform = seller_snapshot()
    issued = _fmt_date(issued_at or datetime.now())

    doc_lines: list[DocLine] = []
    if lines:
        for row in lines:
            doc_lines.append(
                DocLine(
                    description=str(row.get("description") or row.get("title") or "—"),
                    qty=row.get("qty", "1"),
                    unit=_money(currency, row["unit"]) if row.get("unit") is not None else "",
                    amount=_money(currency, row["amount"]) if row.get("amount") is not None else "",
                )
            )
    elif amount is not None:
        label = {
            "expense_voucher": "Expense amount",
            "income_voucher": "Income amount",
        }.get(kind, "Amount")
        doc_lines.append(
            DocLine(description=narration or label, qty="1", unit=_money(currency, amount), amount=_money(currency, amount))
        )

    doc_totals: list[DocTotal] = []
    if totals:
        for row in totals:
            doc_totals.append(
                DocTotal(
                    str(row.get("label") or "Total"),
                    _money(currency, row["value"]) if not isinstance(row.get("value"), str) else str(row["value"]),
                    emphasize=bool(row.get("emphasize")),
                )
            )
    elif amount is not None:
        doc_totals.append(DocTotal("Total", _money(currency, amount), emphasize=True))

    party_label = "Paid to" if kind == "expense_voucher" else "Received from" if kind == "income_voucher" else "Party"

    spec = DocumentSpec(
        kind=kind,
        number=number,
        issued_at=issued,
        currency=currency,
        status=status,
        reference=reference,
        issuer=DocParty(
            label="From",
            name=issuer_name or platform["name"],
            lines=issuer_lines or [platform["address"], f"{platform['phone']} · {platform['email']}"],
        ),
        party=DocParty(
            label=party_label,
            name=party_name or "—",
            lines=party_lines or [],
        ),
        meta=[
            ("Voucher #", number),
            ("Issued", issued),
            ("Type", DOC_TITLES[kind].title()),
        ],
        lines=doc_lines,
        totals=doc_totals,
        notes=narration or "",
        payment_method=payment_method,
        payment_ref=payment_ref,
        footer="Kedi Smart · Accounting voucher · Keep with books of account.",
    )
    return build_document_pdf(spec)
