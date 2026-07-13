from api.security import verify_password
from accounts.models import User


class KediAdminBackend:
    """Authenticate Django admin against accounts.User (email + password_hash)."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = username or kwargs.get("email")
        if not email or not password:
            return None
        user = User.objects.filter(email=email, is_active=True, is_staff=True).first()
        if user and verify_password(password, user.password_hash):
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id, is_active=True, is_staff=True)
        except User.DoesNotExist:
            return None
