from django.contrib import admin, messages
from django.contrib.admin.views.main import ChangeList
from django.db.models import Case, IntegerField, Value, When
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin
from config.admin_site import kedi_admin_site
from siteplatform.forms import SiteSettingForm
from siteplatform.models import AuditLog, ModerationQueue, ModerationStatus, Notification, SiteSetting
from siteplatform.services import ensure_default_settings, serialize_value_preview
from siteplatform.settings_catalog import (
    SETTING_CATALOG,
    SETTING_GROUPS,
    get_setting_meta,
    group_label_for_key,
    human_label_for_key,
)


GROUP_ORDER = {key: index for index, (key, _label) in enumerate(SETTING_GROUPS)}


class SiteSettingChangeList(ChangeList):
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        whens = [
            When(key=meta.key, then=Value(GROUP_ORDER.get(meta.group, 99) * 100 + i))
            for i, meta in enumerate(SETTING_CATALOG.values())
        ]
        return qs.annotate(
            _catalog_order=Case(
                *whens,
                default=Value(10_000),
                output_field=IntegerField(),
            )
        ).order_by("_catalog_order", "key")


@admin.register(SiteSetting, site=kedi_admin_site)
class SiteSettingAdmin(EditSelectedMixin, ModelAdmin):
    form = SiteSettingForm
    compressed_fields = True
    warn_unsaved_form = True
    list_fullwidth = True
    list_filter_sheet = True
    change_list_template = "admin/siteplatform/sitesetting/change_list.html"
    list_display = ("label_display", "group_badge", "value_preview", "key_code", "updated_at")
    list_display_links = ("label_display",)
    search_fields = ("key",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 50
    ordering = ("key",)
    actions = None

    class Media:
        css = {"all": ("admin/css/site_settings.css",)}

    def get_changelist(self, request, **kwargs):
        return SiteSettingChangeList

    def changelist_view(self, request, extra_context=None):
        created = ensure_default_settings()
        if created:
            messages.info(
                request,
                f"Loaded {created} default platform setting{'s' if created != 1 else ''}.",
            )
        extra_context = extra_context or {}
        extra_context["title"] = "Brand & settings"
        return super().changelist_view(request, extra_context=extra_context)

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return (
                (
                    "Create setting",
                    {
                        "fields": ("key", "custom_key"),
                        "description": (
                            "Most brand and contact settings are preloaded. "
                            "Add only if something is missing or you need a custom key."
                        ),
                    },
                ),
            )

        meta = get_setting_meta(obj.key)
        if meta is None or meta.value_type == "json":
            value_fields = ("value_json",)
        elif meta.value_type == "string":
            value_fields = ("value_string",)
        elif meta.value_type == "text":
            value_fields = ("value_text",)
        elif meta.value_type == "url":
            value_fields = ("value_url",)
        elif meta.value_type == "image":
            value_fields = ("value_image",)
        else:
            value_fields = ("value_boolean",)

        return (
            (
                "Setting",
                {
                    "fields": ("key",),
                    "description": meta.help_text if meta else "Custom platform setting.",
                },
            ),
            ("Value", {"fields": value_fields}),
            (
                "Timestamps",
                {
                    "classes": ("collapse",),
                    "fields": ("created_at", "updated_at"),
                },
            ),
        )

    def response_add(self, request, obj, post_url_continue=None):
        self.message_user(
            request, f"Created “{human_label_for_key(obj.key)}”. Update its value below."
        )
        return HttpResponseRedirect(
            reverse("kedi_admin:siteplatform_sitesetting_change", args=[obj.pk])
        )

    def has_delete_permission(self, request, obj=None):
        if obj and obj.key in SETTING_CATALOG:
            return request.user.is_superuser
        return super().has_delete_permission(request, obj)

    @display(description="Setting", ordering="key")
    def label_display(self, obj):
        return format_html(
            '<span class="font-semibold text-font-important-light dark:text-font-important-dark">{}</span>',
            human_label_for_key(obj.key),
        )

    @display(
        description="Group",
        label={
            "Brand & identity": "info",
            "Contact": "success",
            "SEO & discovery": "info",
            "Social links": "warning",
            "Commerce": "success",
            "Features & maintenance": "danger",
            "Custom": "warning",
        },
        ordering="key",
    )
    def group_badge(self, obj):
        label = group_label_for_key(obj.key)
        return label, label

    @display(description="Current value")
    def value_preview(self, obj):
        meta = get_setting_meta(obj.key)
        preview = serialize_value_preview(obj.value_json)
        prefix = "Image · " if meta and meta.value_type == "image" and obj.value_json else ""
        return format_html(
            '<span class="kedi-setting-preview" title="{}">{}{}</span>',
            preview,
            prefix,
            preview,
        )

    @display(description="Key")
    def key_code(self, obj):
        return format_html('<code class="kedi-setting-key">{}</code>', obj.key)


@admin.register(ModerationQueue, site=kedi_admin_site)
class ModerationQueueAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = (
        "entity_label",
        "status_badge",
        "reviewer",
        "notes_preview",
        "created_at",
    )
    list_display_links = ("entity_label",)
    list_filter = ("status", "entity_type")
    search_fields = ("entity_type", "notes", "admin__email")
    readonly_fields = ("created_at", "updated_at")
    autocomplete_fields = ("admin",)
    actions = ["approve_items", "reject_items"]
    list_per_page = 40
    date_hierarchy = "created_at"
    ordering = ("status", "-created_at")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("admin").annotate(
            _status_order=Case(
                When(status=ModerationStatus.PENDING, then=Value(0)),
                When(status=ModerationStatus.APPROVED, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            )
        ).order_by("_status_order", "-created_at")

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["title"] = "Review queue"
        return super().changelist_view(request, extra_context=extra_context)

    @display(description="Item", ordering="entity_type")
    def entity_label(self, obj):
        label = obj.entity_type.replace("_", " ").title()
        return format_html(
            '<span class="font-medium">{}</span>'
            '<span class="text-font-subtle-light dark:text-font-subtle-dark"> · #{}</span>',
            label,
            obj.entity_id,
        )

    @display(
        description="Status",
        label={"pending": "warning", "approved": "success", "rejected": "danger"},
        ordering="status",
    )
    def status_badge(self, obj):
        return obj.status, obj.status.title()

    @display(description="Reviewer", ordering="admin")
    def reviewer(self, obj):
        if not obj.admin_id:
            return "—"
        return obj.admin.email

    @display(description="Notes")
    def notes_preview(self, obj):
        if not obj.notes:
            return "—"
        text = obj.notes.strip()
        return text if len(text) <= 80 else f"{text[:77]}…"

    @action(description="Approve selected")
    def approve_items(self, request, queryset):
        updated = queryset.update(
            status=ModerationStatus.APPROVED,
            admin=request.user if getattr(request.user, "pk", None) else None,
        )
        self.message_user(request, f"Approved {updated} item{'s' if updated != 1 else ''}.")

    @action(description="Reject selected")
    def reject_items(self, request, queryset):
        updated = queryset.update(
            status=ModerationStatus.REJECTED,
            admin=request.user if getattr(request.user, "pk", None) else None,
        )
        self.message_user(request, f"Rejected {updated} item{'s' if updated != 1 else ''}.")


@admin.register(AuditLog, site=kedi_admin_site)
class AuditLogAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("action", "entity_label", "actor", "created_at")
    list_display_links = ("action",)
    list_filter = ("action", "entity_type")
    search_fields = ("action", "entity_type", "actor__email")
    readonly_fields = (
        "actor",
        "action",
        "entity_type",
        "entity_id",
        "meta_json",
        "created_at",
        "updated_at",
    )
    date_hierarchy = "created_at"
    list_per_page = 50
    ordering = ("-created_at",)
    actions = None

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["title"] = "Activity log"
        return super().changelist_view(request, extra_context=extra_context)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        # Append-only compliance trail — view via has_view_permission only.
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @display(description="Entity", ordering="entity_type")
    def entity_label(self, obj):
        label = obj.entity_type.replace("_", " ").title()
        return f"{label} #{obj.entity_id}"


@admin.register(Notification, site=kedi_admin_site)
class NotificationAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("user", "type_badge", "title", "read_badge", "created_at")
    list_display_links = ("title",)
    list_filter = ("type", "read")
    search_fields = ("user__email", "title", "body")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 40
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["title"] = "Member inbox"
        return super().changelist_view(request, extra_context=extra_context)

    @display(
        description="Type",
        label={
            "info": "info",
            "success": "success",
            "warning": "warning",
            "error": "danger",
            "verification": "info",
            "order": "success",
            "appointment": "warning",
            "message": "info",
        },
    )
    def type_badge(self, obj):
        return obj.type, obj.type.replace("_", " ").title()

    @display(
        description="Read",
        label={True: "success", False: "warning"},
    )
    def read_badge(self, obj):
        return obj.read, "Read" if obj.read else "Unread"
