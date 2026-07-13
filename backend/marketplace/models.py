from django.db import models

from accounts.models import User
from api.mixins import TimestampMixin
from pets.models import Pet


class ListingType(models.TextChoices):
    SALE = "sale", "Sale"
    ADOPTION = "adoption", "Adoption"
    GIVEAWAY = "giveaway", "Giveaway"
    CUBS = "cubs", "Cubs"


class ListingStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    PUBLISHED = "published", "Published"
    CLOSED = "closed", "Closed"


class PetListing(TimestampMixin):
    seller = models.ForeignKey(User, on_delete=models.CASCADE, db_column="seller_user_id")
    pet = models.ForeignKey(Pet, on_delete=models.SET_NULL, blank=True, null=True)
    species = models.CharField(max_length=100)
    breed = models.CharField(max_length=255, blank=True, null=True)
    age_text = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    location_text = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    currency = models.CharField(max_length=3, default="BDT", blank=True, null=True)
    type = models.CharField(max_length=20, choices=ListingType.choices)
    vaccination_status_text = models.TextField(blank=True, null=True)
    description_md = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=ListingStatus.choices, default=ListingStatus.PENDING)

    class Meta:
        db_table = "pet_listings"


class ListingPhoto(TimestampMixin):
    listing = models.ForeignKey(PetListing, on_delete=models.CASCADE, related_name="photos")
    url = models.CharField(max_length=500)

    class Meta:
        db_table = "listing_photos"


class ListingReport(TimestampMixin):
    listing = models.ForeignKey(PetListing, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, db_column="reporter_user_id")
    reason = models.TextField()

    class Meta:
        db_table = "listing_reports"
