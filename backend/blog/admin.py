from django.contrib import admin
from unfold.admin import ModelAdmin

from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin
from config.admin_site import kedi_admin_site
from blog.models import BlogComment, BlogPost


@admin.register(BlogPost, site=kedi_admin_site)
class BlogPostAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_display = ("title", "slug", "author", "status", "published_at", "created_at")
    list_display_links = ("title",)
    list_filter = ("status",)
    search_fields = ("title", "slug", "author__email")
    prepopulated_fields = {"slug": ("title",)}
    image_url_fields = (("cover_image_url", "blog", "contain"),)


@admin.register(BlogComment, site=kedi_admin_site)
class BlogCommentAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("post", "user", "created_at")
    list_display_links = ("post",)
    search_fields = ("post__title", "user__email", "body")
