from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin
from pets.models import Pet


class TagStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    ASSIGNED = "assigned", "Assigned"
    LOST = "lost", "Lost"
    RETIRED = "retired", "Retired"


class LostReportStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    FOUND = "found", "Found"
    CLOSED = "closed", "Closed"


class SenderType(models.TextChoices):
    OWNER = "owner", "Owner"
    FINDER = "finder", "Finder"


class NFCTag(TimestampMixin):
    sku_product = models.ForeignKey(
        "shop.Product", on_delete=models.SET_NULL, blank=True, null=True, db_column="sku_product_id"
    )
    tag_uid = models.CharField(max_length=100, unique=True, db_index=True)
    nfc_url = models.CharField(max_length=500, blank=True, null=True)
    qr_url = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=20, choices=TagStatus.choices, default=TagStatus.AVAILABLE)

    class Meta:
        db_table = "nfc_tags"


class TagActivation(TimestampMixin):
    tag = models.ForeignKey(NFCTag, on_delete=models.CASCADE, related_name="activations")
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column="owner_user_id")
    activated_at = models.DateTimeField(auto_now_add=True)
    deactivated_at = models.DateTimeField(blank=True, null=True)
    active = models.BooleanField(default=True)

    class Meta:
        db_table = "tag_activations"


class LostPetReport(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column="owner_user_id")
    last_seen_location_text = models.TextField()
    last_seen_lat = models.CharField(max_length=50, blank=True, null=True)
    last_seen_lng = models.CharField(max_length=50, blank=True, null=True)
    reward_note = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=LostReportStatus.choices, default=LostReportStatus.ACTIVE)
    activated_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "lost_pet_reports"


class FoundReport(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    finder_name = models.CharField(max_length=255, blank=True, null=True)
    finder_contact = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    location_text = models.TextField(blank=True, null=True)
    lat = models.CharField(max_length=50, blank=True, null=True)
    lng = models.CharField(max_length=50, blank=True, null=True)
    photo_urls = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        db_table = "found_reports"


class MaskedMessageThread(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column="owner_user_id")
    finder_session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    class Meta:
        db_table = "masked_message_threads"


class MaskedMessage(TimestampMixin):
    thread = models.ForeignKey(MaskedMessageThread, on_delete=models.CASCADE, related_name="messages")
    sender_type = models.CharField(max_length=20, choices=SenderType.choices)
    message = models.TextField()

    class Meta:
        db_table = "masked_messages"
