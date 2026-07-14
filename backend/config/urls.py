from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path, re_path
from django.views.static import serve

from api.views import root
from config.admin_site import kedi_admin_site

_admin = settings.DJANGO_ADMIN_URL_PREFIX.strip("/")

urlpatterns = [
    path(f"{_admin}/", kedi_admin_site.urls),
    path("", root.index, name="index"),
    path("health", root.health, name="health"),
    path("api/v1/", include("api.urls")),
]

# Serve product images in production too (nginx proxies /uploads/ → gunicorn).
# django.conf.urls.static.static() only works when DEBUG=True.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(
            r"^uploads/(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
