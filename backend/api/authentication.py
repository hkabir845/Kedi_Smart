from functools import wraps

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from accounts.models import User
from api.security import decode_token


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:]
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise AuthenticationFailed("Could not validate credentials")
        user_id = payload.get("sub")
        if user_id is None:
            raise AuthenticationFailed("Could not validate credentials")
        user = User.objects.filter(id=int(user_id), is_active=True).first()
        if not user:
            raise AuthenticationFailed("Could not validate credentials")
        return (user, token)


class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Bearer "):
            return None
        try:
            return super().authenticate(request)
        except AuthenticationFailed:
            return None


def get_current_user(request):
    user = request.user
    if not user or not getattr(user, "is_authenticated", False):
        raise AuthenticationFailed("Could not validate credentials")
    if not user.is_active:
        raise AuthenticationFailed("Inactive user")
    return user


def require_roles(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = get_current_user(request)
            if user.role not in allowed_roles:
                raise PermissionDenied("Not enough permissions")
            request.user = user
            return view_func(request, *args, **kwargs)

        return wrapper

    return decorator


def active_user_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        user = get_current_user(request)
        request.user = user
        return view_func(request, *args, **kwargs)

    return wrapper
