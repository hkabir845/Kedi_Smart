import re
from decimal import Decimal

from django import forms
from django.conf import settings
from django.contrib import admin
from django.http import Http404, HttpResponse
from django.shortcuts import render
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin
from config.admin_site import kedi_admin_site
from shop.models import (
    Cart,
    CartItem,
    CommissionPlan,
    Coupon,
    DocumentStatus,
    ExpenseBill,
    InventoryMovement,
    Invoice,
    Order,
    OrderItem,
    Payment,
    PaymentStatus,
    PlatformLedgerEntry,
    Product,
    ProductApprovalStatus,
    ProductCatalog,
    ProductCategory,
    ProductImage,
    ProductReview,
    ProductSourceType,
    ProductVariant,
    ProductVideo,
    Receipt,
    Shipment,
    ShippingAddress,
    Subscription,
    SubscriptionPlan,
    VendorLedgerEntry,
    VendorPayout,
    VendorStatement,
)
from shop.services.documents import build_order_pdf
from shop.services.inventory import set_stock
from shop.services.invoicing import approve_payment, ensure_documents_for_order
from shop.widgets import ProductImageInlineForm


def _money_display(value) -> str:
    try:
        return f"{Decimal(str(value)):,.2f}"
    except Exception:
        return str(value)


def _invoice_document_context(request, invoice: Invoice, *, autoprint: bool = False) -> dict:
    order = invoice.order
    shipping = getattr(order, "shipping_address", None)
    payment = order.payments.order_by("id").first()
    items = [
        {
            "title": item.title_snapshot,
            "qty": item.qty,
            "unit": _money_display(item.price_snapshot),
            "line": _money_display(item.line_subtotal),
        }
        for item in order.items.all()
    ]

    payment_confirmed = (
        (payment and payment.status == PaymentStatus.COMPLETED)
        or invoice.status == DocumentStatus.PAID
        or order.status == "paid"
    )
    customer_name = (shipping.name if shipping and shipping.name else None) or (
        order.user.email if order.user_id else None
    ) or order.guest_email or "Customer"
    customer_address = ""
    if shipping:
        customer_address = ", ".join(
            part for part in (shipping.address, shipping.city, shipping.country) if part
        )

    frontend = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    logo_url = f"{frontend}/brand/kedismart-mark.png" if frontend else "/static/admin/img/kedismart-logo.png"

    return {
        "doc_title": "Packing invoice",
        "invoice": invoice,
        "order": order,
        "items": items,
        "currency": order.currency or "BDT",
        "issued_at": invoice.issued_at.strftime("%d %b %Y") if invoice.issued_at else "—",
        "customer_name": customer_name,
        "customer_phone": shipping.phone if shipping else "",
        "customer_address": customer_address,
        "customer_notes": shipping.notes if shipping else "",
        "payment_method": payment.get_method_display() if payment else "—",
        "payment_txn": (payment.wallet_txn_id or payment.reference) if payment else "",
        "payment_pending": not payment_confirmed,
        "fulfillment_label": (
            "Store pickup" if order.fulfillment_type == "store_pickup" else "Home delivery"
        ),
        "shipping_label": "Pickup fee" if order.fulfillment_type == "store_pickup" else "Shipping",
        "logo_url": logo_url,
        "back_url": reverse("kedi_admin:shop_invoice_change", args=[invoice.pk]),
        "download_url": reverse("kedi_admin:shop_invoice_download_invoice_pdf", args=[invoice.pk]),
        "autoprint": autoprint,
        "show_discount": bool(order.discount and Decimal(str(order.discount)) != 0),
        "show_tax": bool(order.tax and Decimal(str(order.tax)) != 0),
        "order_subtotal": _money_display(order.subtotal),
        "order_discount": _money_display(order.discount),
        "order_shipping": _money_display(order.shipping_fee),
        "order_tax": _money_display(order.tax),
        "order_total": _money_display(order.total),
    }


class ProductVariantInlineForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = ("sku", "price", "cost_price", "compare_at_price", "stock_qty", "size", "flavor", "is_active")

    def has_changed(self):
        # Default is_active=True + stock_qty=0 make empty extra rows look "filled".
        if not self.instance.pk and self.is_bound:
            sku = (self.data.get(self.add_prefix("sku")) or "").strip()
            price = (self.data.get(self.add_prefix("price")) or "").strip()
            if not sku and not price:
                return False
        return super().has_changed()


class ProductVariantInline(TabularInline):
    model = ProductVariant
    form = ProductVariantInlineForm
    extra = 1
    tab = True
    fields = ("sku", "price", "cost_price", "compare_at_price", "stock_qty", "size", "flavor", "is_active")


class ProductImageInline(TabularInline):
    model = ProductImage
    form = ProductImageInlineForm
    extra = 3
    tab = True
    fields = ("url", "sort_order")
    verbose_name = "Image"
    verbose_name_plural = "Images"

    def get_formset(self, request, obj=None, **kwargs):
        upload_url = reverse("kedi_admin:kedi_upload_image")

        class BoundForm(ProductImageInlineForm):
            def __init__(self, *args, **form_kwargs):
                super().__init__(*args, upload_url=upload_url, **form_kwargs)

            def clean(self):
                cleaned = super().clean()
                if self.cleaned_data.get("DELETE"):
                    return cleaned
                url = (cleaned.get("url") or "").strip()
                # Skip untouched empty extra rows
                if not url and not self.has_changed():
                    return cleaned
                if not url:
                    self.add_error("url", "Upload or paste an image (or paste an image URL).")
                cleaned["url"] = url
                return cleaned

        kwargs["form"] = BoundForm
        return super().get_formset(request, obj, **kwargs)


class ProductVideoInline(TabularInline):
    model = ProductVideo
    extra = 1
    tab = True
    fields = ("title", "video_url", "poster_url", "duration_seconds", "sort_order")
    verbose_name = "Video"
    verbose_name_plural = "Videos"


@admin.register(ProductCategory, site=kedi_admin_site)
class ProductCategoryAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("name", "slug", "catalog", "commission_percent", "parent")
    list_display_links = ("name",)
    list_filter = ("catalog",)
    list_filter_sheet = True
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")
    list_per_page = 50
    list_editable = ("commission_percent",)


@admin.register(Product, site=kedi_admin_site)
class ProductAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_fullwidth = True
    list_filter_sheet = True
    list_display = (
        "title",
        "catalog_badge",
        "source_badge",
        "brand",
        "vendor",
        "status",
        "approval_status",
        "is_featured",
        "created_at",
    )
    list_display_links = ("title",)
    list_filter = ("catalog", "source_type", "status", "approval_status", "is_featured", "category")
    search_fields = ("title", "slug", "brand", "vendor__email")
    list_per_page = 40
    date_hierarchy = "created_at"
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at", "listing_fee_paid")
    autocomplete_fields = ("category", "vendor")
    inlines = [ProductVariantInline, ProductImageInline, ProductVideoInline]
    actions = [
        "publish_products",
        "approve_vendor_products",
        "mark_platform_own",
        "mark_platform_brand",
    ]

    fieldsets = (
        (
            "Product",
            {
                "fields": (
                    "title",
                    "slug",
                    "category",
                    "catalog",
                    "brand",
                    "description_md",
                    "status",
                    "is_featured",
                    "is_digital",
                    "is_nfc_tag_product",
                )
            },
        ),
        (
            "Marketplace ownership",
            {
                "description": (
                    "Platform Own = Kedi Smart private label. "
                    "Platform Brand = authorized world brands stocked by Kedi Smart. "
                    "Vendor = third-party seller (commission applies)."
                ),
                "fields": ("source_type", "vendor", "approval_status", "listing_fee_paid"),
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @display(
        description="Source",
        label={
            ProductSourceType.PLATFORM_OWN: "success",
            ProductSourceType.PLATFORM_BRAND: "info",
            ProductSourceType.VENDOR: "warning",
        },
    )
    def source_badge(self, obj):
        return obj.source_type, obj.get_source_type_display()

    @display(
        description="Catalog",
        label={
            ProductCatalog.PET_ANIMAL: "success",
            ProductCatalog.GENERAL: "info",
        },
    )
    def catalog_badge(self, obj):
        return obj.catalog, obj.get_catalog_display()

    def save_model(self, request, obj, form, change):
        if obj.source_type in (ProductSourceType.PLATFORM_OWN, ProductSourceType.PLATFORM_BRAND):
            obj.vendor = None
            obj.approval_status = ProductApprovalStatus.NOT_REQUIRED
        elif obj.source_type == ProductSourceType.VENDOR and obj.vendor_id:
            if obj.approval_status == ProductApprovalStatus.NOT_REQUIRED:
                obj.approval_status = ProductApprovalStatus.PENDING
        super().save_model(request, obj, form, change)

    def save_formset(self, request, form, formset, change):
        # Persist variants first, then route stock edits through audited set_stock
        instances = formset.save(commit=False)
        for obj in formset.deleted_objects:
            obj.delete()
        for obj in instances:
            if isinstance(obj, ProductVariant):
                incoming_qty = obj.stock_qty
                if obj.pk:
                    prior = ProductVariant.objects.filter(pk=obj.pk).values_list("stock_qty", flat=True).first()
                    obj.stock_qty = prior if prior is not None else incoming_qty
                    obj.save()
                    if prior is None or int(prior) != int(incoming_qty):
                        set_stock(
                            obj,
                            quantity=int(incoming_qty),
                            actor=getattr(request, "user", None),
                            note="Admin stock edit",
                        )
                else:
                    obj.stock_qty = 0
                    obj.save()
                    if int(incoming_qty) != 0:
                        set_stock(
                            obj,
                            quantity=int(incoming_qty),
                            actor=getattr(request, "user", None),
                            note="Admin initial stock",
                        )
            else:
                obj.save()
        formset.save_m2m()

    @action(description="Publish selected products")
    def publish_products(self, request, queryset):
        queryset.update(status="published")

    @action(description="Approve vendor products for sale")
    def approve_vendor_products(self, request, queryset):
        queryset.filter(source_type=ProductSourceType.VENDOR).update(
            approval_status="approved", status="published"
        )

    @action(description="Set as Kedi Smart own brand (platform)")
    def mark_platform_own(self, request, queryset):
        queryset.update(
            source_type=ProductSourceType.PLATFORM_OWN,
            vendor=None,
            approval_status="not_required",
        )

    @action(description="Set as world brand — platform stocked")
    def mark_platform_brand(self, request, queryset):
        queryset.update(
            source_type=ProductSourceType.PLATFORM_BRAND,
            vendor=None,
            approval_status="not_required",
        )


@admin.register(CommissionPlan, site=kedi_admin_site)
class CommissionPlanAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = (
        "name",
        "commission_percent",
        "listing_fee",
        "setup_fee",
        "subscription_monthly_fee",
        "applies_to",
        "is_default",
        "is_active",
    )
    list_display_links = ("name",)
    list_filter = ("is_default", "is_active", "applies_to")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    tab = True
    readonly_fields = (
        "title_snapshot",
        "price_snapshot",
        "qty",
        "line_subtotal",
        "source_type",
        "vendor",
        "commission_rate",
        "platform_fee",
        "vendor_earnings",
        "platform_revenue",
    )
    can_delete = False


class PaymentInline(StackedInline):
    model = Payment
    extra = 0
    tab = True
    readonly_fields = ("approved_at", "approved_by")


class InvoiceInline(StackedInline):
    model = Invoice
    extra = 0
    tab = True
    readonly_fields = ("number",)
    can_delete = False


class ReceiptInline(StackedInline):
    model = Receipt
    extra = 0
    tab = True
    readonly_fields = ("number", "paid_at")
    can_delete = False


class ShippingAddressInline(StackedInline):
    model = ShippingAddress
    extra = 0
    tab = True


@admin.register(Order, site=kedi_admin_site)
class OrderAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_fullwidth = True
    list_filter_sheet = True
    list_display = (
        "id",
        "public_order_number",
        "invoice_number",
        "user",
        "status_badge",
        "fulfillment_type",
        "total",
        "currency",
        "created_at",
    )
    list_filter = ("status", "fulfillment_type", "currency", "created_at")
    search_fields = ("id", "user__email", "guest_email", "track_token", "invoice__number", "receipt__number")
    readonly_fields = ("created_at", "updated_at", "track_token")
    date_hierarchy = "created_at"
    list_per_page = 40
    inlines = [OrderItemInline, PaymentInline, InvoiceInline, ReceiptInline, ShippingAddressInline]
    list_display_links = ("id", "public_order_number")
    actions = [
        "approve_payments",
        "ensure_invoices",
        "mark_processing",
        "mark_shipped",
        "mark_ready_pickup",
        "mark_delivered",
    ]

    @display(description="Order #")
    def public_order_number(self, obj):
        return obj.public_order_number

    @display(description="Invoice")
    def invoice_number(self, obj):
        invoice = Invoice.objects.filter(order_id=obj.id).first()
        if not invoice:
            return "—"
        url = reverse("kedi_admin:shop_invoice_change", args=[invoice.pk])
        return format_html('<a href="{}">{}</a>', url, invoice.number)

    @display(
        description="Status",
        label={
            "pending": "warning",
            "paid": "info",
            "processing": "info",
            "shipped": "info",
            "ready_for_pickup": "info",
            "delivered": "success",
            "cancelled": "danger",
            "refunded": "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Approve payment + issue paid receipt")
    def approve_payments(self, request, queryset):
        for order in queryset:
            payment = order.payments.order_by("id").first()
            if payment and payment.status != PaymentStatus.COMPLETED:
                approve_payment(payment, approved_by=request.user, admin_note="Approved from admin list")

    @action(description="Create missing invoice / receipt")
    def ensure_invoices(self, request, queryset):
        created = 0
        for order in queryset:
            before = Invoice.objects.filter(order_id=order.id).exists()
            ensure_documents_for_order(order)
            after = Invoice.objects.filter(order_id=order.id).exists()
            if after and not before:
                created += 1
        self.message_user(request, f"Created invoices for {created} order(s).")

    @action(description="Mark processing")
    def mark_processing(self, request, queryset):
        queryset.update(status="processing")

    @action(description="Mark shipped")
    def mark_shipped(self, request, queryset):
        queryset.update(status="shipped")

    @action(description="Mark ready for pickup")
    def mark_ready_pickup(self, request, queryset):
        queryset.update(status="ready_for_pickup")

    @action(description="Mark delivered / picked up")
    def mark_delivered(self, request, queryset):
        queryset.update(status="delivered")

    def save_model(self, request, obj, form, change):
        previous_status = None
        if change and obj.pk:
            previous_status = Order.objects.filter(pk=obj.pk).values_list("status", flat=True).first()
        super().save_model(request, obj, form, change)
        # Changing order status to Paid must run the full payment approval pipeline.
        if obj.status == "paid" and previous_status != "paid":
            payment = obj.payments.order_by("id").first()
            if payment and payment.status != PaymentStatus.COMPLETED:
                approve_payment(
                    payment,
                    approved_by=request.user,
                    admin_note="Marked paid from order admin",
                )

    def save_formset(self, request, form, formset, change):
        instances = formset.save(commit=False)
        for obj in formset.deleted_objects:
            obj.delete()
        trigger_approve = False
        for obj in instances:
            if isinstance(obj, Payment) and obj.status == PaymentStatus.COMPLETED:
                trigger_approve = True
            if isinstance(obj, (Invoice, Receipt)) and obj.status == DocumentStatus.PAID:
                trigger_approve = True
            obj.save()
        formset.save_m2m()
        if not trigger_approve or not form.instance.pk:
            return
        payment = Payment.objects.filter(order_id=form.instance.pk).order_by("id").first()
        if not payment:
            return
        if payment.status != PaymentStatus.COMPLETED:
            approve_payment(
                payment,
                approved_by=request.user,
                admin_note="Synced from inline paid/completed status",
            )
        else:
            # Payment already completed in DB — sync docs/order without re-notifying.
            ensure_documents_for_order(form.instance)
            order = form.instance
            order.refresh_from_db()
            if order.status == "pending":
                order.status = "paid"
                order.save(update_fields=["status", "updated_at"])


@admin.register(Payment, site=kedi_admin_site)
class PaymentAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_fullwidth = True
    list_filter_sheet = True
    list_display = (
        "id",
        "order",
        "method",
        "status_badge",
        "wallet_txn_id",
        "amount",
        "approved_at",
        "created_at",
    )
    list_filter = ("status", "method", "created_at")
    search_fields = ("order__id", "wallet_txn_id", "reference", "wallet_phone")
    readonly_fields = ("approved_at", "approved_by", "created_at", "updated_at")
    actions = ["approve_selected"]

    @display(
        description="Status",
        label={"pending": "warning", "completed": "success", "failed": "danger", "refunded": "danger"},
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Approve payment + issue receipt")
    def approve_selected(self, request, queryset):
        for payment in queryset.filter(status=PaymentStatus.PENDING):
            approve_payment(payment, approved_by=request.user, admin_note="Approved from payment queue")

    def save_model(self, request, obj, form, change):
        previous = None
        if change and obj.pk:
            previous = Payment.objects.filter(pk=obj.pk).values_list("status", flat=True).first()
        super().save_model(request, obj, form, change)
        if obj.status == PaymentStatus.COMPLETED and previous != PaymentStatus.COMPLETED:
            approve_payment(
                obj,
                approved_by=request.user,
                admin_note=obj.admin_note or "Marked completed from payment admin",
            )
        elif obj.status == PaymentStatus.COMPLETED:
            ensure_documents_for_order(obj.order)


@admin.register(Invoice, site=kedi_admin_site)
class InvoiceAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_fullwidth = True
    list_filter_sheet = True
    list_display = (
        "number",
        "order_link",
        "customer_name",
        "status_badge",
        "amount_due",
        "seller_name",
        "issued_at",
    )
    list_display_links = ("number",)
    list_filter = ("status", "issued_at")
    search_fields = (
        "number",
        "order__id",
        "seller_name",
        "seller_phone",
        "seller_email",
        "order__user__email",
        "order__guest_email",
        "order__shipping_address__name",
        "order__shipping_address__phone",
    )
    readonly_fields = ("number", "created_at", "updated_at")
    date_hierarchy = "issued_at"
    ordering = ("-issued_at",)
    list_per_page = 40
    actions_detail = ["preview_invoice", "print_invoice", "download_invoice_pdf"]
    actions_row = ["preview_invoice", "print_invoice", "download_invoice_pdf"]

    @display(description="Order #")
    def order_link(self, obj):
        if not obj.order_id:
            return "—"
        url = reverse("kedi_admin:shop_order_change", args=[obj.order_id])
        return format_html('<a href="{}">{}</a>', url, obj.order.public_order_number)

    @display(description="Customer")
    def customer_name(self, obj):
        shipping = getattr(obj.order, "shipping_address", None)
        if shipping and shipping.name:
            return shipping.name
        if obj.order.user_id:
            return obj.order.user.email
        return obj.order.guest_email or "—"

    @display(
        description="Status",
        label={
            DocumentStatus.AWAITING_PAYMENT: "warning",
            DocumentStatus.PAID: "success",
            DocumentStatus.VOID: "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @display(description="Amount", ordering="order__total")
    def amount_due(self, obj):
        total = obj.order.total
        return f"{obj.order.currency} {total}"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("order", "order__user", "order__shipping_address")
            .prefetch_related("order__items", "order__payments")
        )

    def get_search_results(self, request, queryset, search_term):
        queryset, use_distinct = super().get_search_results(request, queryset, search_term)
        term = (search_term or "").strip()
        if not term:
            return queryset, use_distinct

        # Match storefront order numbers: KS-000003 / ks-3
        match = re.fullmatch(r"KS-0*(\d+)", term, flags=re.IGNORECASE)
        if match:
            queryset = (queryset | self.model.objects.filter(order_id=int(match.group(1)))).distinct()
            use_distinct = True
        return queryset, use_distinct

    def _get_invoice_or_404(self, request, object_id) -> Invoice:
        invoice = self.get_object(request, object_id)
        if invoice is None:
            raise Http404("Invoice not found")
        return invoice

    def _render_invoice_document(self, request, object_id, *, autoprint: bool = False):
        invoice = self._get_invoice_or_404(request, object_id)
        context = _invoice_document_context(request, invoice, autoprint=autoprint)
        return render(request, "admin/shop/invoice/document.html", context)

    @action(
        description="Preview",
        icon="visibility",
        url_path="preview",
        attrs={"target": "_blank"},
    )
    def preview_invoice(self, request, object_id):
        return self._render_invoice_document(request, object_id, autoprint=False)

    @action(
        description="Print",
        icon="print",
        url_path="print",
        attrs={"target": "_blank"},
    )
    def print_invoice(self, request, object_id):
        return self._render_invoice_document(request, object_id, autoprint=True)

    @action(
        description="Download PDF",
        icon="download",
        url_path="download-pdf",
    )
    def download_invoice_pdf(self, request, object_id):
        invoice = self._get_invoice_or_404(request, object_id)
        pdf_bytes = build_order_pdf(invoice.order, mode="invoice")
        filename = f"invoice-{invoice.number}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    def save_model(self, request, obj, form, change):
        previous = None
        if change and obj.pk:
            previous = Invoice.objects.filter(pk=obj.pk).values_list("status", flat=True).first()
        super().save_model(request, obj, form, change)
        if obj.status == DocumentStatus.PAID and previous != DocumentStatus.PAID and obj.order_id:
            payment = Payment.objects.filter(order_id=obj.order_id).order_by("id").first()
            if payment and payment.status != PaymentStatus.COMPLETED:
                approve_payment(
                    payment,
                    approved_by=request.user,
                    admin_note="Synced from invoice marked paid",
                )


@admin.register(Receipt, site=kedi_admin_site)
class ReceiptAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_fullwidth = True
    list_filter_sheet = True
    list_display = ("number", "order_link", "status_badge", "amount", "paid_at", "issued_at")
    list_display_links = ("number",)
    list_filter = ("status", "issued_at")
    search_fields = (
        "number",
        "order__id",
        "invoice__number",
        "order__shipping_address__name",
        "order__user__email",
    )
    readonly_fields = ("number", "paid_at", "created_at", "updated_at")
    date_hierarchy = "issued_at"
    ordering = ("-issued_at",)
    actions_detail = ["download_receipt_pdf"]
    actions_row = ["download_receipt_pdf"]

    @display(description="Order #")
    def order_link(self, obj):
        if not obj.order_id:
            return "—"
        url = reverse("kedi_admin:shop_order_change", args=[obj.order_id])
        return format_html('<a href="{}">{}</a>', url, obj.order.public_order_number)

    @display(
        description="Status",
        label={
            DocumentStatus.AWAITING_PAYMENT: "warning",
            DocumentStatus.PAID: "success",
            DocumentStatus.VOID: "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("order", "invoice")

    @action(
        description="Download PDF",
        icon="download",
        url_path="download-pdf",
    )
    def download_receipt_pdf(self, request, object_id):
        receipt = self.get_object(request, object_id)
        if receipt is None:
            raise Http404("Receipt not found")
        pdf_bytes = build_order_pdf(receipt.order, mode="receipt")
        filename = f"receipt-{receipt.number}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    def save_model(self, request, obj, form, change):
        previous = None
        if change and obj.pk:
            previous = Receipt.objects.filter(pk=obj.pk).values_list("status", flat=True).first()
        super().save_model(request, obj, form, change)
        if obj.status == DocumentStatus.PAID and previous != DocumentStatus.PAID and obj.order_id:
            payment = Payment.objects.filter(order_id=obj.order_id).order_by("id").first()
            if payment and payment.status != PaymentStatus.COMPLETED:
                approve_payment(
                    payment,
                    approved_by=request.user,
                    admin_note="Synced from receipt marked paid",
                )


@admin.register(VendorPayout, site=kedi_admin_site)
class VendorPayoutAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_display = ("id", "vendor", "amount", "status_badge", "period_start", "period_end", "paid_at")
    list_display_links = ("id",)
    list_filter = ("status",)
    search_fields = ("vendor__email", "reference")
    actions = ["mark_paid"]

    @display(
        description="Status",
        label={"pending": "warning", "paid": "success", "failed": "danger"},
    )
    def status_badge(self, obj):
        return obj.status, obj.status.title()

    @action(description="Mark payouts as paid")
    def mark_paid(self, request, queryset):
        from shop.services.payouts import mark_payout_paid

        count = 0
        for payout in queryset:
            if payout.status != "paid":
                mark_payout_paid(payout)
                count += 1
        self.message_user(request, f"Marked {count} payout(s) as paid and posted ledger entries.")


@admin.register(VendorLedgerEntry, site=kedi_admin_site)
class VendorLedgerEntryAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("vendor", "entry_type", "amount", "note", "created_at")
    list_display_links = ("vendor",)
    list_filter = ("entry_type",)
    search_fields = ("vendor__email", "note")
    date_hierarchy = "created_at"


@admin.register(PlatformLedgerEntry, site=kedi_admin_site)
class PlatformLedgerEntryAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_fullwidth = True
    list_display = ("entry_type", "amount", "related_user", "reference", "note", "created_at")
    list_display_links = ("entry_type",)
    list_filter = ("entry_type", "created_at")
    search_fields = ("note", "reference", "related_user__email")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"


@admin.register(ExpenseBill, site=kedi_admin_site)
class ExpenseBillAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_fullwidth = True
    list_display = (
        "number",
        "title",
        "kind",
        "category",
        "amount",
        "status",
        "is_platform",
        "owner",
        "issued_at",
    )
    list_display_links = ("number",)
    list_filter = ("kind", "category", "status", "is_platform")
    search_fields = ("number", "title", "counterparty", "owner__email")
    date_hierarchy = "issued_at"
    readonly_fields = ("number", "created_at", "updated_at")


@admin.register(Coupon, site=kedi_admin_site)
class CouponAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("code", "type", "value", "times_used", "usage_limit", "active", "start_date", "end_date")
    list_display_links = ("code",)
    list_filter = ("active", "type")
    search_fields = ("code",)


@admin.register(SubscriptionPlan, site=kedi_admin_site)
class SubscriptionPlanAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("type", "interval", "discount_percent")
    list_display_links = ("type",)


@admin.register(Subscription, site=kedi_admin_site)
class SubscriptionAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("user", "plan", "status", "created_at")
    list_display_links = ("user",)
    list_filter = ("status",)
    search_fields = ("user__email",)


@admin.register(Cart, site=kedi_admin_site)
class CartAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("id", "user", "session_id", "created_at")
    list_display_links = ("id",)
    search_fields = ("user__email", "session_id")


@admin.register(CartItem, site=kedi_admin_site)
class CartItemAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("cart", "variant", "qty")
    list_display_links = ("cart",)


@admin.register(ProductReview, site=kedi_admin_site)
class ProductReviewAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("product", "user", "rating", "title", "created_at")
    list_display_links = ("product",)
    list_filter = ("rating",)
    search_fields = ("product__title", "user__email", "title")


@admin.register(InventoryMovement, site=kedi_admin_site)
class InventoryMovementAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_fullwidth = True
    list_display = ("id", "variant", "delta", "quantity_after", "reason", "actor", "order", "created_at")
    list_display_links = ("id",)
    list_filter = ("reason", "created_at")
    search_fields = ("variant__sku", "variant__product__title", "note", "actor__email")
    readonly_fields = (
        "variant",
        "delta",
        "quantity_after",
        "reason",
        "note",
        "actor",
        "order",
        "order_item",
        "created_at",
        "updated_at",
    )
    date_hierarchy = "created_at"


@admin.register(Shipment, site=kedi_admin_site)
class ShipmentAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("id", "order", "vendor", "status", "courier", "tracking_number", "updated_at")
    list_display_links = ("id",)
    list_filter = ("status", "courier")
    search_fields = ("tracking_number", "consignment_id", "order__id", "vendor__email")
    autocomplete_fields = ("order", "vendor")


@admin.register(VendorStatement, site=kedi_admin_site)
class VendorStatementAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = (
        "id",
        "vendor",
        "period_start",
        "period_end",
        "gross_sales",
        "platform_fees",
        "net",
        "status",
    )
    list_display_links = ("id",)
    list_filter = ("status",)
    search_fields = ("vendor__email",)
    readonly_fields = ("created_at", "updated_at")
