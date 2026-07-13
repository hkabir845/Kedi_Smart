from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from api.views import root
from config.admin_site import kedi_admin_site

urlpatterns = [
    path("admin/", kedi_admin_site.urls),
    path("", root.index, name="index"),
    path("health", root.health, name="health"),
    path("api/v1/", include("api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
