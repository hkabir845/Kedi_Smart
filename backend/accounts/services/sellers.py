"""SellerAccount lifecycle — money accounts for vets and live-animal sellers."""

from django.utils import timezone

from accounts.models import SellerAccount, User, UserRole, UserProfile

# Roles that earn through the platform and get commission + ledger + payouts.
MARKETPLACE_SELLER_ROLES = {
    UserRole.VENDOR,
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
}

# Non-shop sellers use SellerAccount; shop vendors keep VendorProfile.
SELLER_ACCOUNT_ROLES = {
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
}


def is_marketplace_seller(user_or_role) -> bool:
    role = getattr(user_or_role, "role", None) or user_or_role
    return role in MARKETPLACE_SELLER_ROLES


def _default_display_name(user: User) -> str:
    profile = UserProfile.objects.filter(user_id=user.id).first()
    if profile and profile.full_name:
        return profile.full_name
    email = user.email or "seller"
    return email.split("@")[0]


def _plan_for_role(role: str):
    from shop.models import CommissionPlan
    from shop.services.commission import get_default_commission_plan

    slug = "services" if role == UserRole.VET else "live-animal"
    plan = CommissionPlan.objects.filter(slug=slug, is_active=True).first()
    return plan or get_default_commission_plan()


def ensure_seller_account(user: User, *, approved: bool = False) -> SellerAccount | None:
    """Create or return SellerAccount for vet / breeder / trader / shelter."""
    if user.role not in SELLER_ACCOUNT_ROLES:
        return None

    account = SellerAccount.objects.filter(user_id=user.id).first()
    if account:
        return account

    plan = _plan_for_role(user.role)
    now = timezone.now() if approved else None
    return SellerAccount.objects.create(
        user=user,
        display_name=_default_display_name(user),
        commission_plan=plan,
        is_approved=approved,
        is_active=True,
        approved_at=now,
    )


def approve_seller_account(user: User) -> SellerAccount | None:
    """Mark seller verified and ensure an approved SellerAccount exists."""
    if user.role not in SELLER_ACCOUNT_ROLES:
        return None

    if not user.is_verified:
        user.is_verified = True
        user.save(update_fields=["is_verified"])

    plan = _plan_for_role(user.role)
    account = ensure_seller_account(user, approved=True)
    if not account:
        return None

    changed = False
    if not account.is_approved:
        account.is_approved = True
        changed = True
    if not account.is_active:
        account.is_active = True
        changed = True
    if not account.approved_at:
        account.approved_at = timezone.now()
        changed = True
    if plan and not account.commission_plan_id:
        account.commission_plan = plan
        changed = True
    if changed:
        account.save()
    try:
        from shop.services.finance import charge_setup_fee

        charge_setup_fee(user)
    except Exception:
        pass
    return account


def get_seller_finance_profile(user_id: int | None):
    """Return SellerAccount or VendorProfile used for commission / payout config."""
    if not user_id:
        return None
    account = (
        SellerAccount.objects.filter(user_id=user_id, is_active=True)
        .select_related("commission_plan")
        .first()
    )
    if account:
        return account
    from accounts.models import VendorProfile

    return (
        VendorProfile.objects.filter(user_id=user_id, is_active=True)
        .select_related("commission_plan")
        .first()
    )
