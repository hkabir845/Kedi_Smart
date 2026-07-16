from django.contrib import admin
from unfold.admin import ModelAdmin
from unfold.decorators import action, display

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin
from config.admin_site import kedi_admin_site
from blog.models import BlogCategory, BlogComment, BlogPost, BlogTag


@admin.register(BlogCategory, site=kedi_admin_site)
class BlogCategoryAdmin(EditSelectedMixin, ModelAdmin):
    list_display = ("name", "slug", "updated_at")
    search_fields = ("name", "slug", "description")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(BlogTag, site=kedi_admin_site)
class BlogTagAdmin(EditSelectedMixin, ModelAdmin):
    list_display = ("name", "slug", "updated_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(BlogPost, site=kedi_admin_site)
class BlogPostAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_display = ("title", "category", "author", "status_badge", "published_at", "created_at")
    list_display_links = ("title",)
    list_filter = ("status", "category", "tags")
    search_fields = ("title", "slug", "author__email", "excerpt")
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("author", "category", "tags")
    image_url_fields = (("cover_image_url", "blog", "contain"),)
    actions = ["publish_posts"]
    date_hierarchy = "published_at"

    @display(
        description="Status",
        label={"draft": "warning", "published": "success"},
    )
    def status_badge(self, obj):
        return obj.status, obj.get_status_display()

    @action(description="Publish selected posts")
    def publish_posts(self, request, queryset):
        from django.utils import timezone

        queryset.update(status="published", published_at=timezone.now())


@admin.register(BlogComment, site=kedi_admin_site)
class BlogCommentAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_filter_sheet = True
    list_display = ("post", "user", "short_body", "created_at")
    list_display_links = ("post",)
    search_fields = ("post__title", "user__email", "body")
    autocomplete_fields = ("post", "user")
    date_hierarchy = "created_at"

    @admin.display(description="Comment")
    def short_body(self, obj):
        text = obj.body or ""
        return text if len(text) <= 80 else f"{text[:77]}…"
