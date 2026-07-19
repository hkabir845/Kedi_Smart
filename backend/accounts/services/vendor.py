"""VendorProfile lifecycle helpers shared by API and Django admin."""

from django.utils import timezone

from accounts.models import User, UserRole, VendorProfile
from api.utils import slugify


def _unique_shop_slug(base: str) -> str:
    candidate = slugify(base) or "shop"
    slug = candidate
    n = 1
    while VendorProfile.objects.filter(shop_slug=slug).exists():
        n += 1
        slug = f"{candidate}-{n}"
    return slug


def ensure_vendor_profile(user: User, *, approved: bool = False) -> VendorProfile | None:
    """Create or return VendorProfile for a VENDOR user.

    Returns None if the user is not a vendor.
    """
    if user.role != UserRole.VENDOR:
        return None

    profile = VendorProfile.objects.filter(user_id=user.id).first()
    if profile:
        return profile

    from shop.services.commission import get_default_commission_plan

    base = (user.email or "shop").split("@")[0]
    plan = get_default_commission_plan()
    now = timezone.now() if approved else None
    return VendorProfile.objects.create(
        user=user,
        shop_name=f"{base} Shop",
        shop_slug=_unique_shop_slug(f"{base}-shop"),
        commission_plan=plan,
        is_approved=approved,
        is_active=True,
        approved_at=now,
    )


def approve_vendor_user(user: User) -> VendorProfile | None:
    """Mark a vendor user verified and ensure an approved VendorProfile exists."""
    if user.role != UserRole.VENDOR:
        return None

    if not user.is_verified:
        user.is_verified = True
        user.save(update_fields=["is_verified"])

    from shop.services.commission import get_default_commission_plan

    plan = get_default_commission_plan()
    profile = ensure_vendor_profile(user, approved=True)
    if not profile:
        return None

    changed = False
    if not profile.is_approved:
        profile.is_approved = True
        changed = True
    if not profile.is_active:
        profile.is_active = True
        changed = True
    if not profile.approved_at:
        profile.approved_at = timezone.now()
        changed = True
    if plan and not profile.commission_plan_id:
        profile.commission_plan = plan
        changed = True
    if changed:
        profile.save()
    try:
        from shop.services.finance import charge_setup_fee

        charge_setup_fee(user)
    except Exception:
        pass
    return profile
