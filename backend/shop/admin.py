from django import forms
from django.contrib import admin
from django.urls import reverse
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin
from config.admin_site import kedi_admin_site
from shop.models import (
    Cart,
    CartItem,
    CommissionPlan,
    Coupon,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductApprovalStatus,
    ProductCatalog,
    ProductCategory,
    ProductImage,
    ProductReview,
    ProductSourceType,
    ProductVariant,
    ProductVideo,
    ShippingAddress,
    Subscription,
    SubscriptionPlan,
    VendorLedgerEntry,
    VendorPayout,
)
from shop.widgets import ProductImageInlineForm


class ProductVariantInlineForm(forms.ModelForm):
    class Meta:
        model = ProductVariant
        fields = ("sku", "price", "compare_at_price", "stock_qty", "size", "flavor", "is_active")

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
    fields = ("sku", "price", "compare_at_price", "stock_qty", "size", "flavor", "is_active")


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
    list_display = ("name", "slug", "catalog", "parent")
    list_display_links = ("name",)
    list_filter = ("catalog",)
    list_filter_sheet = True
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")
    list_per_page = 50


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
    list_display = ("id", "user", "status_badge", "total", "currency", "created_at")
    list_filter = ("status", "currency", "created_at")
    search_fields = ("id", "user__email", "guest_email")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    list_per_page = 40
    inlines = [OrderItemInline, PaymentInline, ShippingAddressInline]
    list_display_links = ("id",)
    actions = ["mark_paid", "mark_delivered"]

    @display(
        description="Status",
        label={
            "pending": "warning",
            "paid": "info",
            "processing": "info",
            "shipped": "info",
            "delivered": "success",
            "cancelled": "danger",
            "refunded": "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Mark as paid")
    def mark_paid(self, request, queryset):
        queryset.update(status="paid")

    @action(description="Mark as delivered")
    def mark_delivered(self, request, queryset):
        queryset.update(status="delivered")


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
        from django.utils import timezone

        queryset.update(status="paid", paid_at=timezone.now())


@admin.register(VendorLedgerEntry, site=kedi_admin_site)
class VendorLedgerEntryAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("vendor", "entry_type", "amount", "note", "created_at")
    list_display_links = ("vendor",)
    list_filter = ("entry_type",)
    search_fields = ("vendor__email", "note")
    date_hierarchy = "created_at"


@admin.register(Coupon, site=kedi_admin_site)
class CouponAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("code", "type", "value", "active", "start_date", "end_date")
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
