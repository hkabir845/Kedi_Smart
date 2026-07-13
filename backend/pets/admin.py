from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin, ImageUrlInlineMixin
from config.admin_site import kedi_admin_site
from pets.models import Pet, PetMedicalRecord, PetPhoto, PetPrivacySetting


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


@admin.register(Pet, site=kedi_admin_site)
class PetAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("name", "species", "breed", "owner", "gender", "created_at")
    list_display_links = ("name",)
    list_filter = ("species", "gender")
    search_fields = ("name", "breed", "owner__email")
    inlines = [PetPhotoInline, PetPrivacyInline]


@admin.register(PetPhoto, site=kedi_admin_site)
class PetPhotoAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("pet", "url", "is_primary", "created_at")
    list_display_links = ("pet",)
    search_fields = ("pet__name", "url")
    image_url_fields = (("url", "pets", "contain"),)


@admin.register(PetMedicalRecord, site=kedi_admin_site)
class PetMedicalRecordAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("pet", "created_by", "created_at")
    list_display_links = ("pet",)
    search_fields = ("pet__name",)
