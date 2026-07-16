import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import login as django_login
from django.core.signing import BadSignature, TimestampSigner
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import PasswordResetToken, RefreshToken, User, UserProfile, UserRole
from api.authentication import JWTAuthentication, get_current_user
from api.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from api.throttling import AuthSensitiveThrottle, AuthThrottle
from api.views import serialize_model

_STAFF_BRIDGE_SIGNER = TimestampSigner(salt="kedismart-staff-bridge")


def _make_staff_bridge_token(user_id: int) -> str:
    return _STAFF_BRIDGE_SIGNER.sign(str(user_id))


def _user_from_staff_bridge_token(token: str):
    try:
        user_id = int(_STAFF_BRIDGE_SIGNER.unsign(token, max_age=120))
    except (BadSignature, ValueError, TypeError):
        return None
    return User.objects.filter(id=user_id, is_active=True, is_staff=True).first()


def _issue_tokens(user):
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    expires_at = timezone.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    RefreshToken.objects.create(user=user, token=refresh_token, expires_at=expires_at)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


SELF_REGISTER_ROLES = {
    UserRole.OWNER,
    UserRole.VENDOR,
    UserRole.VET,
    UserRole.BREEDER,
    UserRole.TRADER,
    UserRole.SHELTER,
}


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def register(request):
    data = request.data
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    full_name = data.get("full_name")
    phone = data.get("phone")
    role = data.get("role") or UserRole.OWNER
    if role not in SELF_REGISTER_ROLES:
        role = UserRole.OWNER

    if not email or "@" not in email:
        return Response({"detail": "A valid email is required"}, status=status.HTTP_400_BAD_REQUEST)
    password_error = validate_password_strength(password)
    if password_error:
        return Response({"detail": password_error}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"detail": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create(
        email=email,
        password_hash=get_password_hash(password),
        role=role,
    )
    UserProfile.objects.create(user=user, full_name=full_name or email.split("@")[0], phone=phone)
    if role == UserRole.VENDOR:
        from accounts.services.vendor import ensure_vendor_profile

        ensure_vendor_profile(user, approved=False)
    elif role in (
        UserRole.VET,
        UserRole.BREEDER,
        UserRole.TRADER,
        UserRole.SHELTER,
    ):
        from accounts.services.sellers import ensure_seller_account

        ensure_seller_account(user, approved=False)
    tokens = _issue_tokens(user)
    tokens["user"] = {"id": user.id, "email": user.email, "role": user.role}
    return Response(tokens, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def login(request):
    data = request.data
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")

    user = User.objects.filter(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return Response(
            {"detail": "Incorrect email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        return Response({"detail": "Inactive user"}, status=status.HTTP_400_BAD_REQUEST)

    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])

    tokens = _issue_tokens(user)
    tokens["user"] = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "is_staff": user.is_staff,
    }
    if user.is_staff:
        tokens["django_admin_url"] = _django_admin_public_url()
        tokens["staff_bridge_token"] = _make_staff_bridge_token(user.id)
    return Response(tokens)


def _django_admin_public_url() -> str:
    """Where staff land after the session bridge.

    Local (DEBUG, split origin): http://localhost:8000/admin/
    Production / same host: /django-admin/ (relative — never APP_URL + path)

    Fragile env (full URL in DJANGO_ADMIN_PUBLIC_PATH, APP_URL ending in
    /django-admin, mismatched APP_URL vs FRONTEND_URL strings) used to produce:
    https://host/django-admin/https://host/django-admin/
    """
    from urllib.parse import urlparse

    prefix = getattr(settings, "DJANGO_ADMIN_URL_PREFIX", "admin").strip("/") or "admin"
    raw = (getattr(settings, "DJANGO_ADMIN_PUBLIC_PATH", None) or f"/{prefix}/").strip()

    # Absolute URL accidentally stored as PUBLIC_PATH → take path only
    if "://" in raw:
        path = urlparse(raw).path or f"/{prefix}/"
    else:
        path = raw if raw.startswith("/") else f"/{raw}"
    if not path.endswith("/"):
        path = f"{path}/"

    app = urlparse((settings.APP_URL or "").strip())
    front = urlparse((settings.FRONTEND_URL or "").strip())
    same_host = bool(app.hostname and front.hostname and app.hostname == front.hostname)

    # Production / tunnel / same public host: always relative (nginx owns routing)
    if same_host or not settings.DEBUG:
        return path

    # Local split-origin (Next :3000 ↔ Django :8000)
    origin = (settings.APP_URL or "http://localhost:8000").rstrip("/")
    for junk in (f"/{prefix}", "/django-admin", "/admin"):
        if origin.endswith(junk):
            origin = origin[: -len(junk)].rstrip("/") or origin
            break
    return f"{origin}{path}"


def _django_admin_login_url(*, error: str | None = None) -> str:
    """Django Unfold login (not the storefront). Used after failed bridges / logout."""
    base = _django_admin_public_url().rstrip("/") + "/login/"
    if error:
        return f"{base}?error={error}"
    return base


@csrf_exempt
@require_POST
def staff_login(request):
    """Browser form POST from frontend login → Django session → Unfold admin."""
    email = (request.POST.get("email") or "").strip().lower()
    password = request.POST.get("password") or ""

    user = User.objects.filter(email=email, is_active=True, is_staff=True).first()
    if not user or not verify_password(password, user.password_hash):
        return HttpResponseRedirect(_django_admin_login_url(error="staff"))

    django_login(request, user, backend="accounts.backends.KediAdminBackend")
    return HttpResponseRedirect(_django_admin_public_url())


@csrf_exempt
def staff_login_start(request):
    """One-time signed link from frontend login → Django session → Unfold admin."""
    user = _user_from_staff_bridge_token(request.GET.get("token", ""))
    if not user:
        return HttpResponseRedirect(_django_admin_login_url(error="staff"))

    django_login(request, user, backend="accounts.backends.KediAdminBackend")
    return HttpResponseRedirect(_django_admin_public_url())


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def staff_bridge_token(request):
    """Issue a one-time link for an already signed-in staff user."""
    user = get_current_user(request)
    if not user.is_staff:
        return Response({"detail": "Not enough permissions"}, status=status.HTTP_403_FORBIDDEN)
    return Response({"staff_bridge_token": _make_staff_bridge_token(user.id)})


@csrf_exempt
@require_POST
def staff_bridge(request):
    """JWT → Django session for staff already signed in on the frontend."""
    token = (request.POST.get("access_token") or "").strip()
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return HttpResponseRedirect(_django_admin_login_url())

    user = User.objects.filter(
        id=int(payload.get("sub")),
        is_active=True,
        is_staff=True,
    ).first()
    if not user:
        return HttpResponseRedirect(_django_admin_login_url())

    django_login(request, user, backend="accounts.backends.KediAdminBackend")
    return HttpResponseRedirect(_django_admin_public_url())


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh(request):
    refresh_token = request.data.get("refresh_token") or request.query_params.get("refresh_token")
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return Response({"detail": "Invalid refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

    token_model = RefreshToken.objects.filter(token=refresh_token).first()
    if not token_model or token_model.expires_at < timezone.now():
        return Response({"detail": "Refresh token expired or invalid"}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = payload.get("sub")
    user = User.objects.filter(id=int(user_id), is_active=True).first()
    if not user:
        return Response({"detail": "User not found or inactive"}, status=status.HTTP_401_UNAUTHORIZED)

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    token_model.delete()
    expires_at = timezone.now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    RefreshToken.objects.create(user=user, token=new_refresh_token, expires_at=expires_at)

    return Response(
        {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def logout(request):
    refresh_token = request.data.get("refresh_token") or request.query_params.get("refresh_token")
    token_model = RefreshToken.objects.filter(token=refresh_token).first()
    if token_model:
        token_model.delete()
    return Response({"message": "Logged out successfully"})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def forgot_password(request):
    """Send a 6-digit email OTP (and a backup reset link) for password recovery."""
    from accounts.services.mail import send_password_reset_otp

    email = (request.data.get("email") or "").strip().lower()
    ttl = int(getattr(settings, "PASSWORD_RESET_OTP_TTL_MINUTES", 15))
    window_min = int(getattr(settings, "PASSWORD_RESET_OTP_WINDOW_MINUTES", 15))
    max_per_window = int(getattr(settings, "PASSWORD_RESET_OTP_MAX_PER_WINDOW", 5))

    user = User.objects.filter(email=email).first() if email else None
    if user:
        window_start = timezone.now() - timedelta(minutes=window_min)
        recent = PasswordResetToken.objects.filter(
            user_id=user.id, created_at__gte=window_start
        ).count()
        if recent >= max_per_window:
            # Same response shape — avoid email enumeration / abuse signal
            return Response(
                {
                    "message": "If that email is registered, a 6-digit OTP has been sent.",
                    "method": "otp",
                    "expires_in_minutes": ttl,
                }
            )

        # Invalidate prior unused tokens for this user
        PasswordResetToken.objects.filter(user_id=user.id, used=False).update(used=True)

        otp = f"{secrets.randbelow(1_000_000):06d}"
        # Unique token stores user id + OTP so lookups are email+otp safe
        token = f"{user.id}:{otp}"
        expires_at = timezone.now() + timedelta(minutes=ttl)
        PasswordResetToken.objects.create(user=user, token=token, expires_at=expires_at)
        send_password_reset_otp(to_email=user.email, otp=otp)

    # Same response whether or not the email exists (anti-enumeration)
    return Response(
        {
            "message": "If that email is registered, a 6-digit OTP has been sent.",
            "method": "otp",
            "expires_in_minutes": ttl,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthSensitiveThrottle])
def reset_password(request):
    """Reset password using email+OTP or a legacy/full reset token."""
    data = request.data
    new_password = data.get("new_password")
    password_error = validate_password_strength(new_password)
    if password_error:
        return Response({"detail": password_error}, status=status.HTTP_400_BAD_REQUEST)

    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or data.get("code") or "").strip()
    raw_token = (data.get("token") or "").strip()

    reset_token = None
    if email and otp:
        user = User.objects.filter(email=email).first()
        if user:
            candidate = f"{user.id}:{otp}"
            reset_token = PasswordResetToken.objects.filter(
                token=candidate, used=False, user_id=user.id
            ).first()
    elif raw_token:
        # Support "userId:otp", bare 6-digit OTP (needs email), or legacy urlsafe tokens
        if ":" in raw_token:
            reset_token = PasswordResetToken.objects.filter(token=raw_token, used=False).first()
        elif raw_token.isdigit() and len(raw_token) == 6 and email:
            user = User.objects.filter(email=email).first()
            if user:
                reset_token = PasswordResetToken.objects.filter(
                    token=f"{user.id}:{raw_token}", used=False, user_id=user.id
                ).first()
        else:
            reset_token = PasswordResetToken.objects.filter(token=raw_token, used=False).first()

    if not reset_token or reset_token.expires_at < timezone.now():
        return Response(
            {"detail": "Invalid or expired OTP. Request a new code."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(id=reset_token.user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user.password_hash = get_password_hash(new_password)
    reset_token.used = True
    user.save(update_fields=["password_hash"])
    reset_token.save(update_fields=["used"])
    RefreshToken.objects.filter(user_id=user.id).delete()

    return Response({"message": "Password reset successfully"})


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
def me(request):
    user = get_current_user(request)
    profile = UserProfile.objects.filter(user_id=user.id).first()
    return Response(
        {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
            "is_staff": user.is_staff,
            "is_verified": user.is_verified,
            "profile": serialize_model(profile) if profile else None,
        }
    )
