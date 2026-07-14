from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import display

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin, ImageUrlInlineMixin
from config.admin_site import kedi_admin_site
from pets.models import (
    Pet,
    PetHealthReminder,
    PetMedicalRecord,
    PetPhoto,
    PetPrivacySetting,
    Prescription,
    Vaccination,
)


class PetPhotoInline(ImageUrlInlineMixin, TabularInline):
    model = PetPhoto
    extra = 2
    tab = True
    fields = ("url", "is_primary")
    image_url_fields = (("url", "pets", "contain"),)


class PetPrivacyInline(TabularInline):
    model = PetPrivacySetting
    extra = 0
    can_delete = False
    tab = True
    max_num = 1


class VaccinationInline(TabularInline):
    model = Vaccination
    extra = 0
    tab = True
    fields = ("vaccine_name", "date_given", "next_due_date", "vet", "notes")
    autocomplete_fields = ("vet",)


class PrescriptionInline(TabularInline):
    model = Prescription
    extra = 0
    tab = True
    fields = ("vet", "issued_at", "medication_list", "notes")
    autocomplete_fields = ("vet",)


class HealthReminderInline(TabularInline):
    model = PetHealthReminder
    extra = 0
    tab = True
    fields = ("type", "due_date", "status")


@admin.register(Pet, site=kedi_admin_site)
class PetAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("name", "species_badge", "breed", "owner", "gender", "created_at")
    list_display_links = ("name",)
    list_filter = ("species", "gender")
    search_fields = ("name", "breed", "owner__email", "color_markings")
    autocomplete_fields = ("owner",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    list_per_page = 40
    inlines = [
        PetPhotoInline,
        PetPrivacyInline,
        VaccinationInline,
        PrescriptionInline,
        HealthReminderInline,
    ]
    fieldsets = (
        (
            "Passport",
            {
                "fields": (
                    "owner",
                    "name",
                    "species",
                    "breed",
                    "color_markings",
                    "gender",
                    "dob",
                    "age_text",
                    "weight_kg",
                    "spayed_neutered",
                )
            },
        ),
        (
            "Care & safety",
            {
                "fields": ("temperament", "special_needs", "instructions_if_found"),
                "description": "Shown to finders when a pet is marked lost (subject to privacy settings).",
            },
        ),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @display(
        description="Species",
        label=True,
    )
    def species_badge(self, obj):
        return obj.get_species_display()


@admin.register(PetPhoto, site=kedi_admin_site)
class PetPhotoAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("pet", "url", "is_primary", "created_at")
    list_display_links = ("pet",)
    search_fields = ("pet__name", "url")
    autocomplete_fields = ("pet",)
    image_url_fields = (("url", "pets", "contain"),)


@admin.register(PetMedicalRecord, site=kedi_admin_site)
class PetMedicalRecordAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("pet", "type", "title", "record_date", "created_by", "created_at")
    list_display_links = ("title",)
    list_filter = ("type",)
    search_fields = ("pet__name", "title", "notes", "created_by__email")
    autocomplete_fields = ("pet", "created_by")
    date_hierarchy = "record_date"


@admin.register(Vaccination, site=kedi_admin_site)
class VaccinationAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("pet", "vaccine_name", "date_given", "next_due_date", "vet")
    list_display_links = ("vaccine_name",)
    search_fields = ("pet__name", "vaccine_name", "vet__email")
    autocomplete_fields = ("pet", "vet")
    date_hierarchy = "date_given"


@admin.register(Prescription, site=kedi_admin_site)
class PrescriptionAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("pet", "vet", "issued_at", "created_at")
    list_display_links = ("pet",)
    search_fields = ("pet__name", "vet__email", "notes")
    autocomplete_fields = ("pet", "vet")
    date_hierarchy = "issued_at"


@admin.register(PetHealthReminder, site=kedi_admin_site)
class PetHealthReminderAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("pet", "type", "due_date", "status_badge")
    list_display_links = ("pet",)
    list_filter = ("status", "type")
    search_fields = ("pet__name", "type")
    autocomplete_fields = ("pet",)
    date_hierarchy = "due_date"

    @display(
        description="Status",
        label={"pending": "warning", "done": "success", "overdue": "danger"},
    )
    def status_badge(self, obj):
        return obj.status, (obj.status or "pending").title()
