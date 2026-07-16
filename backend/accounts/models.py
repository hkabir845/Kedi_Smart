from django.db import models

from api.mixins import TimestampMixin


class UserRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    VET = "VET", "Vet"
    VENDOR = "VENDOR", "Vendor"
    BREEDER = "BREEDER", "Breeder"
    TRADER = "TRADER", "Trader"
    SHELTER = "SHELTER", "Shelter"
    ADMIN = "ADMIN", "Admin"
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"


class VerificationType(models.TextChoices):
    VET = "vet", "Vet"
    VENDOR = "vendor", "Vendor"
    SELLER = "seller", "Seller"
    SHELTER = "shelter", "Shelter"


class VerificationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class User(TimestampMixin):
    email = models.CharField(max_length=255, unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.OWNER)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    last_login = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "users"

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_username(self):
        return self.email

    def has_perm(self, perm, obj=None):
        """Grant admin model access to active staff (sidebar + changelists)."""
        if not self.is_active:
            return False
        # This project does not use Django's per-codename auth_permission rows.
        # Only is_staff users can authenticate to /admin/ (see KediAdminBackend).
        return bool(self.is_superuser or self.is_staff)

    def has_module_perms(self, app_label):
        return self.has_perm(None)


class UserProfile(TimestampMixin):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=60, blank=True, null=True)
    city = models.CharField(max_length=120, blank=True, null=True)
    country = models.CharField(max_length=120, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.JSONField(default=dict, blank=True, null=True)
    avatar_url = models.CharField(max_length=500, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    privacy_settings = models.JSONField(default=dict, blank=True, null=True)

    class Meta:
        db_table = "user_profiles"


class RefreshToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    token = models.CharField(max_length=500, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refresh_tokens"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_index=True)
    token = models.CharField(max_length=255, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_reset_tokens"


class VendorTier(models.TextChoices):
    FREE = "free", "Free"
    PRO = "pro", "Pro"
    ENTERPRISE = "enterprise", "Enterprise"


class VendorProfile(TimestampMixin):
    """Shop vendor on the Kedi Smart marketplace (products + Seller Central money fields)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="vendor_profile")
    shop_name = models.CharField(max_length=255)
    shop_slug = models.CharField(max_length=120, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    logo_url = models.CharField(max_length=500, blank=True, null=True)
    tier = models.CharField(max_length=20, choices=VendorTier.choices, default=VendorTier.FREE)
    commission_plan = models.ForeignKey(
        "shop.CommissionPlan",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="vendors",
    )
    commission_rate_override = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Optional % override; blank uses plan default.",
    )
    payout_method = models.CharField(max_length=50, default="bank_transfer")
    payout_details = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "vendor_profiles"

    def __str__(self):
        return self.shop_name


class SellerAccount(TimestampMixin):
    """Money account for marketplace sellers who are not shop vendors.

    Amazon/Etsy-style: commission plan, ledger identity, and payout details for
    veterinarians, breeders, traders, and shelters. Shop vendors use VendorProfile.
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_account")
    display_name = models.CharField(max_length=255)
    commission_plan = models.ForeignKey(
        "shop.CommissionPlan",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="seller_accounts",
    )
    commission_rate_override = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Optional % override; blank uses plan default.",
    )
    payout_method = models.CharField(max_length=50, default="bank_transfer")
    payout_details = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "seller_accounts"

    def __str__(self):
        return self.display_name


class VerificationRequest(TimestampMixin):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="verification_requests")
    type = models.CharField(max_length=20, choices=VerificationType.choices)
    docs_urls = models.JSONField(default=list, blank=True, null=True)
    status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    admin_notes = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_verifications",
        db_column="reviewed_by_user_id",
    )
    reviewed_at = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = "verification_requests"
