from django.apps import AppConfig


class SiteplatformConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "siteplatform"
    verbose_name = "Platform"

    def ready(self):
        from . import admin  # noqa: F401
