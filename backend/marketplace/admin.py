from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin, ImageUrlInlineMixin
from config.admin_site import kedi_admin_site
from marketplace.models import ListingPhoto, ListingReport, PetListing


class ListingPhotoInline(ImageUrlInlineMixin, TabularInline):
    model = ListingPhoto
    extra = 2
    tab = True
    fields = ("url",)
    image_url_fields = (("url", "listings", "contain"),)


@admin.register(PetListing, site=kedi_admin_site)
class PetListingAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_fullwidth = True
    list_display = ("species", "breed", "seller", "type", "price", "status_badge", "created_at")
    list_display_links = ("species",)
    list_filter = ("type", "status", "species")
    search_fields = ("species", "breed", "seller__email", "location_text")
    date_hierarchy = "created_at"
    list_per_page = 40
    inlines = [ListingPhotoInline]
    actions = ["approve_listings", "publish_listings"]

    @display(
        description="Status",
        label={
            "pending": "warning",
            "approved": "success",
            "published": "success",
            "rejected": "danger",
            "closed": "info",
        },
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Approve listings")
    def approve_listings(self, request, queryset):
        queryset.update(status="approved")

    @action(description="Publish listings")
    def publish_listings(self, request, queryset):
        queryset.update(status="published")


@admin.register(ListingPhoto, site=kedi_admin_site)
class ListingPhotoAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("listing", "url", "created_at")
    list_display_links = ("listing",)
    search_fields = ("listing__species", "listing__breed", "url")
    image_url_fields = (("url", "listings", "contain"),)


@admin.register(ListingReport, site=kedi_admin_site)
class ListingReportAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("listing", "reporter", "reason", "created_at")
    list_display_links = ("listing",)
    search_fields = ("listing__species", "reporter__email", "reason")
