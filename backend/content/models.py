from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin


class ContentStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"


class AnimalCategory(TimestampMixin):
    slug = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "animal_categories"


class ContentTopic(TimestampMixin):
    category = models.ForeignKey(AnimalCategory, on_delete=models.CASCADE, related_name="topics")
    slug = models.CharField(max_length=200, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    excerpt = models.TextField(blank=True, null=True)
    body_md = models.TextField(blank=True, null=True)
    cover_image_url = models.CharField(max_length=500, blank=True, null=True)
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, db_column="author_user_id"
    )
    vet_verified = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=ContentStatus.choices, default=ContentStatus.DRAFT)
    published_at = models.DateTimeField(blank=True, null=True)
    tags = models.ManyToManyField("ContentTag", through="ContentTopicTag", related_name="topics")

    class Meta:
        db_table = "content_topics"
        indexes = [
            models.Index(
                fields=["status", "category", "-published_at"],
                name="topic_status_cat_idx",
            ),
        ]


class ContentTag(TimestampMixin):
    slug = models.CharField(max_length=100, unique=True, db_index=True)
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "content_tags"


class ContentTopicTag(models.Model):
    # Legacy SQLAlchemy table uses a composite PK (no surrogate id).
    pk = models.CompositePrimaryKey("topic", "tag")
    topic = models.ForeignKey(ContentTopic, on_delete=models.CASCADE)
    tag = models.ForeignKey(ContentTag, on_delete=models.CASCADE)

    class Meta:
        db_table = "content_topic_tags"


class FAQItem(TimestampMixin):
    topic = models.ForeignKey(ContentTopic, on_delete=models.CASCADE, related_name="faqs")
    question = models.CharField(max_length=500)
    answer = models.TextField()

    class Meta:
        db_table = "faq_items"


class SEOSetting(TimestampMixin):
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.IntegerField(db_index=True)
    meta_title = models.CharField(max_length=255, blank=True, null=True)
    meta_description = models.CharField(max_length=500, blank=True, null=True)
    canonical_url = models.CharField(max_length=500, blank=True, null=True)
    og_image_url = models.CharField(max_length=500, blank=True, null=True)
    noindex = models.BooleanField(default=False)
    json_ld_override = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = "seo_settings"
        indexes = [
            models.Index(fields=["entity_type", "entity_id"], name="seo_entity_idx"),
        ]
