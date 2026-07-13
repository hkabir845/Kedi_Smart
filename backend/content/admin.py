from django.contrib import admin
from unfold.admin import ModelAdmin

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin
from config.admin_site import kedi_admin_site
from content.models import AnimalCategory, ContentTag, ContentTopic, FAQItem, SEOSetting


@admin.register(AnimalCategory, site=kedi_admin_site)
class AnimalCategoryAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("name", "slug")
    list_display_links = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(ContentTopic, site=kedi_admin_site)
class ContentTopicAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("title", "slug", "category", "status", "published_at")
    list_display_links = ("title",)
    list_filter = ("status", "category", "vet_verified")
    search_fields = ("title", "slug")
    prepopulated_fields = {"slug": ("title",)}
    image_url_fields = (("cover_image_url", "content", "contain"),)


@admin.register(ContentTag, site=kedi_admin_site)
class ContentTagAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("name", "slug")
    list_display_links = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(FAQItem, site=kedi_admin_site)
class FAQItemAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("question", "topic")
    list_display_links = ("question",)
    search_fields = ("question", "answer", "topic__title")


@admin.register(SEOSetting, site=kedi_admin_site)
class SEOSettingAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("entity_type", "entity_id", "meta_title", "noindex")
    list_display_links = ("entity_type",)
    list_filter = ("entity_type", "noindex")
    search_fields = ("entity_type", "meta_title", "canonical_url")
    image_url_fields = (("og_image_url", "seo", "contain"),)
