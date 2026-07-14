from django.contrib import admin
from django.utils import timezone
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin
from config.admin_site import kedi_admin_site
from nfc.models import (
    FoundReport,
    LostPetReport,
    LostReportStatus,
    MaskedMessage,
    MaskedMessageThread,
    NFCTag,
    TagActivation,
    TagStatus,
)


class TagActivationInline(TabularInline):
    model = TagActivation
    extra = 0
    tab = True
    fields = ("pet", "owner", "active", "activated_at", "deactivated_at")
    readonly_fields = ("activated_at",)
    autocomplete_fields = ("pet", "owner")
    show_change_link = True


class MaskedMessageInline(TabularInline):
    model = MaskedMessage
    extra = 0
    tab = True
    fields = ("sender_type", "message", "created_at")
    readonly_fields = ("created_at",)
    can_delete = False


@admin.register(NFCTag, site=kedi_admin_site)
class NFCTagAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("tag_uid", "status_badge", "sku_product", "created_at")
    list_display_links = ("tag_uid",)
    list_filter = ("status",)
    search_fields = ("tag_uid", "nfc_url", "qr_url", "sku_product__title")
    autocomplete_fields = ("sku_product",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    list_per_page = 40
    inlines = [TagActivationInline]
    actions = ["mark_available", "mark_retired"]
    fieldsets = (
        (
            "Tag identity",
            {
                "fields": ("tag_uid", "status", "sku_product"),
                "description": "UID is scanned from the physical NFC chip. Link an NFC product SKU when the tag was sold in the shop.",
            },
        ),
        ("Public links", {"fields": ("nfc_url", "qr_url")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @display(
        description="Status",
        label={
            TagStatus.AVAILABLE: "info",
            TagStatus.ASSIGNED: "success",
            TagStatus.LOST: "warning",
            TagStatus.RETIRED: "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Mark tags available")
    def mark_available(self, request, queryset):
        queryset.update(status=TagStatus.AVAILABLE)

    @action(description="Retire selected tags")
    def mark_retired(self, request, queryset):
        queryset.update(status=TagStatus.RETIRED)


@admin.register(TagActivation, site=kedi_admin_site)
class TagActivationAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("tag", "pet", "owner", "active_badge", "activated_at", "deactivated_at")
    list_display_links = ("tag",)
    list_filter = ("active",)
    search_fields = ("tag__tag_uid", "pet__name", "owner__email")
    autocomplete_fields = ("tag", "pet", "owner")
    readonly_fields = ("activated_at", "created_at", "updated_at")
    actions = ["deactivate_activations"]
    date_hierarchy = "activated_at"

    @display(description="Active", label={True: "success", False: "danger"})
    def active_badge(self, obj):
        return obj.active, "Active" if obj.active else "Off"

    @action(description="Deactivate selected")
    def deactivate_activations(self, request, queryset):
        queryset.filter(active=True).update(active=False, deactivated_at=timezone.now())


@admin.register(LostPetReport, site=kedi_admin_site)
class LostPetReportAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("pet", "owner", "status_badge", "last_seen_location_text", "activated_at", "closed_at")
    list_display_links = ("pet",)
    list_filter = ("status",)
    search_fields = ("pet__name", "owner__email", "last_seen_location_text", "reward_note")
    autocomplete_fields = ("pet", "owner")
    readonly_fields = ("activated_at", "created_at", "updated_at")
    date_hierarchy = "activated_at"
    actions = ["mark_found", "close_reports"]
    fieldsets = (
        (None, {"fields": ("pet", "owner", "status")}),
        (
            "Last seen",
            {
                "fields": (
                    "last_seen_location_text",
                    "last_seen_lat",
                    "last_seen_lng",
                    "reward_note",
                )
            },
        ),
        ("Lifecycle", {"fields": ("activated_at", "closed_at", "created_at", "updated_at")}),
    )

    @display(
        description="Status",
        label={
            LostReportStatus.ACTIVE: "warning",
            LostReportStatus.FOUND: "success",
            LostReportStatus.CLOSED: "info",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Mark as found")
    def mark_found(self, request, queryset):
        queryset.update(status=LostReportStatus.FOUND, closed_at=timezone.now())

    @action(description="Close lost reports")
    def close_reports(self, request, queryset):
        queryset.update(status=LostReportStatus.CLOSED, closed_at=timezone.now())


@admin.register(FoundReport, site=kedi_admin_site)
class FoundReportAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("pet", "finder_name", "finder_contact", "location_text", "created_at")
    list_display_links = ("pet",)
    search_fields = ("pet__name", "finder_name", "finder_contact", "message", "location_text")
    autocomplete_fields = ("pet",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    fieldsets = (
        (None, {"fields": ("pet", "message", "photo_urls")}),
        (
            "Finder",
            {"fields": ("finder_name", "finder_contact", "location_text", "lat", "lng")},
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(MaskedMessageThread, site=kedi_admin_site)
class MaskedMessageThreadAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("id", "pet", "owner", "finder_session_id", "created_at")
    list_display_links = ("id",)
    search_fields = ("pet__name", "owner__email", "finder_session_id")
    autocomplete_fields = ("pet", "owner")
    readonly_fields = ("created_at", "updated_at")
    inlines = [MaskedMessageInline]
    date_hierarchy = "created_at"


@admin.register(MaskedMessage, site=kedi_admin_site)
class MaskedMessageAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("thread", "sender_type", "short_message", "created_at")
    list_display_links = ("thread",)
    list_filter = ("sender_type",)
    search_fields = ("message", "thread__pet__name", "thread__owner__email")
    autocomplete_fields = ("thread",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"

    @admin.display(description="Message")
    def short_message(self, obj):
        text = obj.message or ""
        return text if len(text) <= 80 else f"{text[:77]}…"
