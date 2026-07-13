from django.contrib import admin
from unfold.admin import ModelAdmin

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin
from config.admin_site import kedi_admin_site
from vets.models import Appointment, VetAvailability, VetProfile


@admin.register(VetProfile, site=kedi_admin_site)
class VetProfileAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("clinic_name", "user", "city", "verification_status", "online_consultation_enabled")
    list_display_links = ("clinic_name",)
    list_filter = ("verification_status", "online_consultation_enabled", "city")
    search_fields = ("clinic_name", "user__email", "city", "license_no")
    image_url_fields = (("clinic_image_url", "vets", "contain"),)


@admin.register(VetAvailability, site=kedi_admin_site)
class VetAvailabilityAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("vet", "day_of_week", "start_time", "end_time", "mode")
    list_display_links = ("vet",)
    list_filter = ("mode", "day_of_week")


@admin.register(Appointment, site=kedi_admin_site)
class AppointmentAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("id", "vet", "pet", "status", "mode", "scheduled_at")
    list_display_links = ("id",)
    list_filter = ("status", "mode")
    search_fields = ("vet__clinic_name", "pet__name")
