from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin


class ModerationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class NotificationType(models.TextChoices):
    INFO = "info", "Info"
    SUCCESS = "success", "Success"
    WARNING = "warning", "Warning"
    ERROR = "error", "Error"
    VERIFICATION = "verification", "Verification"
    ORDER = "order", "Order"
    APPOINTMENT = "appointment", "Appointment"
    MESSAGE = "message", "Message"


class SiteSetting(TimestampMixin):
    key = models.CharField(max_length=255, unique=True, db_index=True)
    value_json = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = "site_settings"
        verbose_name = "Brand setting"
        verbose_name_plural = "Brand & settings"

    def __str__(self):
        return self.key


class ModerationQueue(TimestampMixin):
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.IntegerField(db_index=True)
    status = models.CharField(
        max_length=20, choices=ModerationStatus.choices, default=ModerationStatus.PENDING
    )
    admin = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, db_column="admin_user_id"
    )
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "moderation_queue"
        verbose_name = "Review item"
        verbose_name_plural = "Review queue"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.entity_type} #{self.entity_id}"


class AuditLog(TimestampMixin):
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, db_column="actor_user_id"
    )
    action = models.CharField(max_length=100, db_index=True)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.IntegerField(db_index=True)
    meta_json = models.JSONField(blank=True, null=True)

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Activity event"
        verbose_name_plural = "Activity log"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} · {self.entity_type} #{self.entity_id}"


class Notification(TimestampMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, null=True)
    read = models.BooleanField(default=False)

    class Meta:
        db_table = "notifications"
        verbose_name = "Member notification"
        verbose_name_plural = "Member inbox"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
