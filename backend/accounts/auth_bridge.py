"""Bridge accounts.User ↔ django.contrib.auth.User for admin LogEntry FKs.

Staff sessions use accounts.User (table `users`), but Django's admin LogEntry
still FKs to auth_user because AUTH_USER_MODEL is the default auth.User.
Mirroring staff rows into auth_user (same primary key) lets Save write the
admin history without IntegrityError.
"""

from __future__ import annotations

from django.contrib.auth.models import User as DjangoUser
from django.db import IntegrityError, transaction


def ensure_django_auth_user(user) -> None:
    """Ensure a matching auth.User row exists for this accounts.User pk."""
    if user is None or not getattr(user, "pk", None):
        return
    if not getattr(user, "is_staff", False):
        return

    email = (getattr(user, "email", None) or "").strip()
    username = (email or f"user-{user.pk}")[:150]
    if DjangoUser.objects.filter(username=username).exclude(pk=user.pk).exists():
        username = f"{username[:140]}-{user.pk}"

    defaults = {
        "username": username,
        "email": email,
        "is_staff": True,
        "is_active": bool(getattr(user, "is_active", True)),
        "is_superuser": bool(getattr(user, "is_superuser", False)),
    }
    try:
        with transaction.atomic():
            DjangoUser.objects.update_or_create(pk=user.pk, defaults=defaults)
    except IntegrityError:
        # Username race / collision — fall back to a unique username.
        defaults["username"] = f"kedi-staff-{user.pk}"
        DjangoUser.objects.update_or_create(pk=user.pk, defaults=defaults)


def sync_staff_auth_users() -> int:
    """Backfill auth_user for every staff accounts.User. Returns count synced."""
    from accounts.models import User

    count = 0
    for user in User.objects.filter(is_staff=True).iterator():
        ensure_django_auth_user(user)
        count += 1
    return count
