from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin


class PetSpecies(models.TextChoices):
    CAT = "cat", "Cat"
    DOG = "dog", "Dog"
    BIRD = "bird", "Bird"
    FISH = "fish", "Fish"
    REPTILE = "reptile", "Reptile"
    SMALL_PET = "small_pet", "Small Pet"
    LIVESTOCK = "livestock", "Livestock"
    EXOTIC = "exotic", "Exotic"
    OTHER = "other", "Other"


class PetGender(models.TextChoices):
    MALE = "male", "Male"
    FEMALE = "female", "Female"
    UNKNOWN = "unknown", "Unknown"


class Pet(TimestampMixin):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pets", db_column="owner_user_id")
    name = models.CharField(max_length=120)
    species = models.CharField(max_length=20, choices=PetSpecies.choices)
    breed = models.CharField(max_length=120, blank=True, null=True)
    color_markings = models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    age_text = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, choices=PetGender.choices, default=PetGender.UNKNOWN)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    spayed_neutered = models.BooleanField(default=False, blank=True, null=True)
    temperament = models.TextField(blank=True, null=True)
    special_needs = models.TextField(blank=True, null=True)
    instructions_if_found = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "pets"


class PetPhoto(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name="photos")
    url = models.CharField(max_length=500)
    is_primary = models.BooleanField(default=False)

    class Meta:
        db_table = "pet_photos"


class PetPrivacySetting(models.Model):
    pet = models.OneToOneField(Pet, on_delete=models.CASCADE, related_name="privacy_setting")
    public_fields = models.JSONField(default=dict, blank=True, null=True)
    allow_call = models.BooleanField(default=False)
    allow_whatsapp = models.BooleanField(default=False)
    allow_chat = models.BooleanField(default=True)
    show_city_only = models.BooleanField(default=True)
    show_reward_note = models.BooleanField(default=True)

    class Meta:
        db_table = "pet_privacy_settings"


class PetMedicalRecord(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name="medical_records")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, blank=True, null=True, db_column="created_by_user_id"
    )
    type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    notes = models.TextField(blank=True, null=True)
    attachments = models.JSONField(default=list, blank=True, null=True)
    record_date = models.DateField()

    class Meta:
        db_table = "pet_medical_records"


class Vaccination(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name="vaccinations")
    vaccine_name = models.CharField(max_length=255)
    date_given = models.DateField()
    next_due_date = models.DateField(blank=True, null=True)
    vet = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, db_column="vet_user_id")
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "vaccinations"


class Prescription(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name="prescriptions")
    vet = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, db_column="vet_user_id")
    issued_at = models.DateField()
    medication_list = models.JSONField(default=list)
    notes = models.TextField(blank=True, null=True)
    attachments = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        db_table = "prescriptions"


class PetHealthReminder(TimestampMixin):
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name="health_reminders")
    type = models.CharField(max_length=100)
    due_date = models.DateField()
    status = models.CharField(max_length=50, default="pending")

    class Meta:
        db_table = "pet_health_reminders"
