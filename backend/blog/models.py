from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin


class BlogStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"


class BlogPost(TimestampMixin):
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, db_column="author_user_id")
    slug = models.CharField(max_length=255, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    excerpt = models.TextField(blank=True, null=True)
    body_md = models.TextField(blank=True, null=True)
    cover_image_url = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=20, choices=BlogStatus.choices, default=BlogStatus.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "blog_posts"


class BlogComment(TimestampMixin):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    body = models.TextField()

    class Meta:
        db_table = "blog_comments"


class BlogLike(TimestampMixin):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        db_table = "blog_likes"
