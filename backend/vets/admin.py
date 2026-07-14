from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin
from config.admin_site import kedi_admin_site
from vets.models import (
    Appointment,
    AppointmentStatus,
    ConsultationNote,
    VetAvailability,
    VetProfile,
)


class ConsultationNoteInline(TabularInline):
    model = ConsultationNote
    extra = 0
    tab = True
    fields = ("vet", "notes", "attachments", "created_at")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("vet",)


class VetAvailabilityInline(TabularInline):
    model = VetAvailability
    extra = 0
    tab = True
    fields = ("day_of_week", "start_time", "end_time", "mode")


@admin.register(VetProfile, site=kedi_admin_site)
class VetProfileAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_display = (
        "clinic_name",
        "user",
        "city",
        "verification_badge",
        "online_consultation_enabled",
    )
    list_display_links = ("clinic_name",)
    list_filter = ("verification_status", "online_consultation_enabled", "city")
    search_fields = ("clinic_name", "user__email", "city", "license_no")
    autocomplete_fields = ("user",)
    readonly_fields = ("created_at", "updated_at")
    image_url_fields = (("clinic_image_url", "vets", "contain"),)
    inlines = [VetAvailabilityInline]
    actions = ["approve_clinics", "reject_clinics"]
    fieldsets = (
        (
            "Clinic",
            {
                "fields": (
                    "user",
                    "clinic_name",
                    "clinic_image_url",
                    "specialties",
                    "years_experience",
                    "license_no",
                    "verification_status",
                    "online_consultation_enabled",
                )
            },
        ),
        ("Location", {"fields": ("address", "city", "country")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    def get_inline_instances(self, request, obj=None):
        # VetAvailability.vet uses to_field="user"; empty add forms crash when
        # the unsaved VetProfile has no user yet. Add availability after save.
        if obj is None or not getattr(obj, "user_id", None):
            return []
        return super().get_inline_instances(request, obj)

    @display(
        description="Verification",
        label={"pending": "warning", "approved": "success", "rejected": "danger"},
    )
    def verification_badge(self, obj):
        return obj.verification_status, (obj.verification_status or "pending").title()

    @action(description="Approve clinic profiles")
    def approve_clinics(self, request, queryset):
        queryset.update(verification_status="approved")

    @action(description="Reject clinic profiles")
    def reject_clinics(self, request, queryset):
        queryset.update(verification_status="rejected")


@admin.register(VetAvailability, site=kedi_admin_site)
class VetAvailabilityAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("vet", "day_of_week", "start_time", "end_time", "mode")
    list_display_links = ("vet",)
    list_filter = ("mode", "day_of_week")
    search_fields = ("vet__clinic_name", "vet__user__email")
    autocomplete_fields = ("vet",)


@admin.register(Appointment, site=kedi_admin_site)
class AppointmentAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("id", "vet", "pet", "owner", "status_badge", "mode", "scheduled_at")
    list_display_links = ("id",)
    list_filter = ("status", "mode")
    search_fields = ("vet__clinic_name", "pet__name", "owner__email", "notes")
    autocomplete_fields = ("pet", "owner", "vet")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "scheduled_at"
    inlines = [ConsultationNoteInline]
    actions = ["confirm_appointments", "complete_appointments", "cancel_appointments"]

    @display(
        description="Status",
        label={
            AppointmentStatus.REQUESTED: "warning",
            AppointmentStatus.CONFIRMED: "info",
            AppointmentStatus.COMPLETED: "success",
            AppointmentStatus.CANCELLED: "danger",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Confirm appointments")
    def confirm_appointments(self, request, queryset):
        queryset.update(status=AppointmentStatus.CONFIRMED)

    @action(description="Mark completed")
    def complete_appointments(self, request, queryset):
        queryset.update(status=AppointmentStatus.COMPLETED)

    @action(description="Cancel appointments")
    def cancel_appointments(self, request, queryset):
        queryset.update(status=AppointmentStatus.CANCELLED)


@admin.register(ConsultationNote, site=kedi_admin_site)
class ConsultationNoteAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("appointment", "vet", "short_notes", "created_at")
    list_display_links = ("appointment",)
    search_fields = ("notes", "vet__email", "appointment__pet__name")
    autocomplete_fields = ("appointment", "vet")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"

    @admin.display(description="Notes")
    def short_notes(self, obj):
        text = obj.notes or ""
        return text if len(text) <= 80 else f"{text[:77]}…"
