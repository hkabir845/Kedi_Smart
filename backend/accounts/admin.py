from django.contrib import admin
from django.utils import timezone
from unfold.admin import ModelAdmin, StackedInline
from unfold.decorators import action, display

from accounts.models import (
    PasswordResetToken,
    RefreshToken,
    User,
    UserProfile,
    UserRole,
    VendorProfile,
    VerificationRequest,
    VerificationStatus,
    VerificationType,
)
from accounts.services.vendor import approve_vendor_user, ensure_vendor_profile
from config.admin_mixins import EditSelectedMixin, ImageUrlFieldsMixin, ImageUrlInlineMixin
from config.admin_site import kedi_admin_site


class UserProfileInline(ImageUrlInlineMixin, StackedInline):
    model = UserProfile
    extra = 0
    can_delete = False
    tab = True
    image_url_fields = (("avatar_url", "avatars", "square"),)


@admin.register(User, site=kedi_admin_site)
class UserAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_display = ("id", "email", "role", "is_active", "is_verified", "created_at")
    list_display_links = ("email",)
    list_filter = ("role", "is_active", "is_verified")
    search_fields = ("email", "profile__full_name")
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 40
    date_hierarchy = "created_at"
    inlines = [UserProfileInline]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.is_staff:
            from accounts.auth_bridge import ensure_django_auth_user

            ensure_django_auth_user(obj)
        # Verifying a vendor in Users must also create their VendorProfile row.
        if obj.role == UserRole.VENDOR:
            if obj.is_verified:
                approve_vendor_user(obj)
            else:
                ensure_vendor_profile(obj, approved=False)


@admin.register(VendorProfile, site=kedi_admin_site)
class VendorProfileAdmin(EditSelectedMixin, ImageUrlFieldsMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_display = (
        "shop_name",
        "user",
        "tier",
        "commission_plan",
        "commission_rate_override",
        "approval_badge",
        "is_active",
    )
    list_display_links = ("shop_name",)
    list_filter = ("tier", "is_approved", "is_active", "commission_plan")
    search_fields = ("shop_name", "shop_slug", "user__email")
    readonly_fields = ("created_at", "updated_at", "approved_at")
    autocomplete_fields = ("user", "commission_plan")
    actions = ["approve_vendors"]
    image_url_fields = (("logo_url", "logos", "contain"),)
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "user",
                    "shop_name",
                    "shop_slug",
                    "description",
                    "logo_url",
                    "tier",
                    "commission_plan",
                    "commission_rate_override",
                    "payout_method",
                    "payout_details",
                    "is_active",
                    "is_approved",
                    "approved_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @display(
        description="Approval",
        label={True: "success", False: "warning"},
    )
    def approval_badge(self, obj):
        return obj.is_approved, "Approved" if obj.is_approved else "Pending"

    @action(description="Approve selected vendors")
    def approve_vendors(self, request, queryset):
        from django.utils import timezone

        queryset.update(is_approved=True, approved_at=timezone.now())


@admin.register(VerificationRequest, site=kedi_admin_site)
class VerificationRequestAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    warn_unsaved_form = True
    list_filter_sheet = True
    list_display = ("user", "type", "status_badge", "created_at", "reviewed_by")
    list_display_links = ("user",)
    list_filter = ("type", "status")
    search_fields = ("user__email", "admin_notes")
    autocomplete_fields = ("user", "reviewed_by")
    readonly_fields = ("created_at", "updated_at", "reviewed_at")
    actions = ["approve_requests", "reject_requests"]
    fieldsets = (
        (None, {"fields": ("user", "type", "docs_urls", "status")}),
        ("Review", {"fields": ("admin_notes", "reviewed_by", "reviewed_at")}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @display(
        description="Status",
        label={"pending": "warning", "approved": "success", "rejected": "danger"},
    )
    def status_badge(self, obj):
        return obj.status, obj.status.title()

    def _review(self, request, queryset, status):
        reviewer = request.user if isinstance(request.user, User) else None
        pending = list(queryset.filter(status=VerificationStatus.PENDING))
        for verification in pending:
            verification.status = status
            verification.reviewed_by = reviewer
            verification.reviewed_at = timezone.now().isoformat()
            verification.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
            if status == VerificationStatus.APPROVED:
                target = verification.user
                target.is_verified = True
                target.save(update_fields=["is_verified"])
                if (
                    verification.type == VerificationType.VENDOR
                    and target.role == UserRole.VENDOR
                ):
                    approve_vendor_user(target)

    @action(description="Approve selected verifications")
    def approve_requests(self, request, queryset):
        self._review(request, queryset, VerificationStatus.APPROVED)

    @action(description="Reject selected verifications")
    def reject_requests(self, request, queryset):
        self._review(request, queryset, VerificationStatus.REJECTED)


@admin.register(RefreshToken, site=kedi_admin_site)
class RefreshTokenAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("user", "expires_at", "created_at")
    list_display_links = ("user",)
    search_fields = ("user__email", "token")


@admin.register(PasswordResetToken, site=kedi_admin_site)
class PasswordResetTokenAdmin(EditSelectedMixin, ModelAdmin):
    compressed_fields = True
    list_display = ("user", "used", "expires_at", "created_at")
    list_display_links = ("user",)
    search_fields = ("user__email",)
