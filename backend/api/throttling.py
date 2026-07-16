from rest_framework.throttling import AnonRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Limit login/register brute-force attempts."""

    scope = "auth"


class AuthSensitiveThrottle(AnonRateThrottle):
    """Stricter limit for OTP guess / password reset."""

    scope = "auth_sensitive"
