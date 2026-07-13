from django.conf import settings
from django.http import HttpResponseRedirect


def _frontend_login_url(*, admin_target: bool = True) -> str:
    base = f"{settings.FRONTEND_URL.rstrip('/')}/login"
    if admin_target:
        return f"{base}?next=admin"
    return base


class AdminFrontendLoginMiddleware:
    """Send unauthenticated Django admin traffic to the frontend login page."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if path.startswith("/admin") and not request.user.is_authenticated:
            return HttpResponseRedirect(_frontend_login_url())
        return self.get_response(request)
