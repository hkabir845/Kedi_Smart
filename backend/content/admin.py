from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import action, display

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
    list_filter_sheet = True
    list_display = ("title", "category", "status_badge", "vet_verified", "published_at")
    list_display_links = ("title",)
    list_filter = ("status", "category", "vet_verified")
    search_fields = ("title", "slug", "body_md")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("author", "category")
    image_url_fields = (("cover_image_url", "content", "contain"),)
    actions = ["publish_topics"]
    date_hierarchy = "published_at"

    @display(
        description="Status",
        label={"draft": "warning", "published": "success"},
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Publish selected guides")
    def publish_topics(self, request, queryset):
        from django.utils import timezone

        queryset.update(status="published", published_at=timezone.now())


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
    autocomplete_fields = ("topic",)


@admin.register(SEOSetting, site=kedi_admin_site)
class SEOSettingAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("entity_type", "entity_id", "meta_title", "noindex")
    list_display_links = ("entity_type",)
    list_filter = ("entity_type", "noindex")
    search_fields = ("entity_type", "meta_title", "canonical_url")
    image_url_fields = (("og_image_url", "seo", "contain"),)
