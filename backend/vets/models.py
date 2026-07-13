from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin
from pets.models import Pet


class AppointmentMode(models.TextChoices):
    ONLINE = "online", "Online"
    CLINIC = "clinic", "Clinic"


class AppointmentStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    CONFIRMED = "confirmed", "Confirmed"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class VetProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, db_column="user_id")
    clinic_name = models.CharField(max_length=255)
    specialties = models.JSONField(default=list, blank=True, null=True)
    years_experience = models.IntegerField(blank=True, null=True)
    license_no = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField()
    city = models.CharField(max_length=120)
    country = models.CharField(max_length=120)
    online_consultation_enabled = models.BooleanField(default=False)
    clinic_image_url = models.CharField(max_length=500, blank=True, null=True)
    verification_status = models.CharField(max_length=50, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vet_profiles"


class VetAvailability(TimestampMixin):
    vet = models.ForeignKey(
        VetProfile, on_delete=models.CASCADE, related_name="availability", to_field="user", db_column="vet_user_id"
    )
    day_of_week = models.IntegerField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    mode = models.CharField(max_length=20, choices=AppointmentMode.choices)

    class Meta:
        db_table = "vet_availability"


class Appointment(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column="owner_user_id")
    vet = models.ForeignKey(
        VetProfile, on_delete=models.CASCADE, related_name="appointments", to_field="user", db_column="vet_user_id"
    )
    scheduled_at = models.DateTimeField()
    mode = models.CharField(max_length=20, choices=AppointmentMode.choices)
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.REQUESTED)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "appointments"


class ConsultationNote(TimestampMixin):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="consultation_notes")
    vet = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, db_column="vet_user_id")
    notes = models.TextField()
    attachments = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        db_table = "consultation_notes"
