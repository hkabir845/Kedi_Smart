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
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import PasswordResetToken, RefreshToken, User, UserProfile, UserRole
from api.authentication import JWTAuthentication, get_current_user
from api.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
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
def register(request):
    data = request.data
    email = (data.get("email") or "").strip().lower()
    password = data.get("password")
    full_name = data.get("full_name")
    phone = data.get("phone")
    role = data.get("role") or UserRole.OWNER
    if role not in SELF_REGISTER_ROLES:
        role = UserRole.OWNER

    if User.objects.filter(email=email).exists():
        return Response({"detail": "Email already registered"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create(
        email=email,
        password_hash=get_password_hash(password),
        role=role,
    )
    UserProfile.objects.create(user=user, full_name=full_name or email.split("@")[0], phone=phone)
    tokens = _issue_tokens(user)
    tokens["user"] = {"id": user.id, "email": user.email, "role": user.role}
    return Response(tokens, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
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

    Local (DEBUG): http://localhost:8000/admin/
    Production single-origin: /django-admin/ (relative, nginx → Django)
    """
    prefix = getattr(settings, "DJANGO_ADMIN_URL_PREFIX", "admin").strip("/")
    path = getattr(settings, "DJANGO_ADMIN_PUBLIC_PATH", f"/{prefix}/")
    if not path.startswith("/"):
        path = f"/{path}"
    if not path.endswith("/"):
        path = f"{path}/"

    # Same public host as the Next app → never bounce to Next's /admin UI
    app = (settings.APP_URL or "").rstrip("/")
    front = (settings.FRONTEND_URL or "").rstrip("/")
    if app and front and app == front:
        return "/django-admin/"

    return f"{app}{path}"


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
def forgot_password(request):
    email = request.data.get("email")
    user = User.objects.filter(email=email).first()
    if user:
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=1)
        PasswordResetToken.objects.create(user=user, token=token, expires_at=expires_at)
        print(f"Password reset token for {user.email}: {token}")
        print(f"Reset URL: {settings.FRONTEND_URL}/reset-password?token={token}")

    return Response({"message": "If email exists, reset link has been sent"})


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    data = request.data
    token = data.get("token")
    new_password = data.get("new_password")

    reset_token = PasswordResetToken.objects.filter(token=token, used=False).first()
    if not reset_token or reset_token.expires_at < timezone.now():
        return Response({"detail": "Invalid or expired reset token"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(id=reset_token.user_id).first()
    if not user:
        return Response({"detail": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    user.password_hash = get_password_hash(new_password)
    reset_token.used = True
    user.save(update_fields=["password_hash"])
    reset_token.save(update_fields=["used"])

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
            "is_verified": user.is_verified,
            "profile": serialize_model(profile) if profile else None,
        }
    )
