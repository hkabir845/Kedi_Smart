import os
from pathlib import Path

from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-secret-key-in-production")
DEBUG = os.environ.get("DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.inlines",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.forms",
    "rest_framework",
    "corsheaders",
    "accounts",
    "pets",
    "nfc",
    "content",
    "blog",
    "shop",
    "vets",
    "marketplace",
    "siteplatform",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "config.middleware.AdminFrontendLoginMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "data" / "kedismart.db",
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "/uploads/"
MEDIA_ROOT = BASE_DIR / "uploads"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTHENTICATION_BACKENDS = [
    "accounts.backends.KediAdminBackend",
    "django.contrib.auth.backends.ModelBackend",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "UNAUTHENTICATED_USER": None,
}

CORS_ALLOWED_ORIGINS = os.environ.get(
    "BACKEND_CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
).split(",")
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

CSRF_TRUSTED_ORIGINS = os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:8000",
).split(",")

APP_NAME = "Kedi Smart"
APP_URL = os.environ.get("APP_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
API_V1_STR = "/api/v1"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
JWT_ALGORITHM = "HS256"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Use project TEMPLATES so custom form widgets (e.g. product image dropzone) resolve.
FORM_RENDERER = "django.forms.renderers.TemplatesSetting"

# Brand orange from frontend: rgb(242, 101, 34) / #F26522
UNFOLD = {
    "SITE_TITLE": "Kedi Smart Admin",
    "SITE_HEADER": "Kedi Smart",
    "SITE_SUBHEADER": "Control panel",
    "SITE_URL": os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    "SITE_SYMBOL": "pets",
    "SITE_DROPDOWN": [
        {
            "icon": "storefront",
            "title": _("Open storefront"),
            "link": os.environ.get("FRONTEND_URL", "http://localhost:3000"),
        },
        {
            "icon": "dashboard",
            "title": _("Admin dashboard"),
            "link": reverse_lazy("kedi_admin:index"),
        },
    ],
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "SHOW_BACK_BUTTON": True,
    "BORDER_RADIUS": "10px",
    "DASHBOARD_CALLBACK": "config.admin_site.dashboard_callback",
    "ENVIRONMENT": "config.admin_site.environment_callback",
    "STYLES": [
        lambda request: static("admin/css/kedi_admin.css"),
    ],
    "COLORS": {
        "primary": {
            "50": "#fff7ed",
            "100": "#ffedd5",
            "200": "#fed7aa",
            "300": "#fdba74",
            "400": "#fb923c",
            "500": "#F26522",
            "600": "#ea580c",
            "700": "#c2410c",
            "800": "#9a3412",
            "900": "#7c2d12",
            "950": "#431407",
        },
    },
    "COMMAND": {
        "search_models": True,
        "show_history": True,
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": _("Overview"),
                "separator": True,
                "items": [
                    {
                        "title": _("Dashboard"),
                        "icon": "dashboard",
                        "link": reverse_lazy("kedi_admin:index"),
                    },
                ],
            },
            {
                "title": _("Commerce"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Products"),
                        "icon": "inventory_2",
                        "link": reverse_lazy("kedi_admin:shop_product_changelist"),
                        "badge": "config.admin_site.badge_pending_approvals",
                        "badge_variant": "warning",
                    },
                    {
                        "title": _("Categories"),
                        "icon": "category",
                        "link": reverse_lazy("kedi_admin:shop_productcategory_changelist"),
                    },
                    {
                        "title": _("Orders"),
                        "icon": "local_shipping",
                        "link": reverse_lazy("kedi_admin:shop_order_changelist"),
                    },
                    {
                        "title": _("Coupons"),
                        "icon": "sell",
                        "link": reverse_lazy("kedi_admin:shop_coupon_changelist"),
                    },
                    {
                        "title": _("Reviews"),
                        "icon": "star",
                        "link": reverse_lazy("kedi_admin:shop_productreview_changelist"),
                    },
                ],
            },
            {
                "title": _("Vendors & money"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Vendors"),
                        "icon": "store",
                        "link": reverse_lazy("kedi_admin:accounts_vendorprofile_changelist"),
                    },
                    {
                        "title": _("Commission plans"),
                        "icon": "percent",
                        "link": reverse_lazy("kedi_admin:shop_commissionplan_changelist"),
                    },
                    {
                        "title": _("Payouts"),
                        "icon": "account_balance_wallet",
                        "link": reverse_lazy("kedi_admin:shop_vendorpayout_changelist"),
                        "badge": "config.admin_site.badge_pending_payouts",
                        "badge_variant": "warning",
                    },
                    {
                        "title": _("Ledger"),
                        "icon": "menu_book",
                        "link": reverse_lazy("kedi_admin:shop_vendorledgerentry_changelist"),
                    },
                ],
            },
            {
                "title": _("Marketplace"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Pet listings"),
                        "icon": "pets",
                        "link": reverse_lazy("kedi_admin:marketplace_petlisting_changelist"),
                    },
                ],
            },
            {
                "title": _("People"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Users"),
                        "icon": "group",
                        "link": reverse_lazy("kedi_admin:accounts_user_changelist"),
                    },
                ],
            },
            {
                "title": _("Trust & safety"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Review queue"),
                        "icon": "policy",
                        "link": reverse_lazy("kedi_admin:siteplatform_moderationqueue_changelist"),
                        "badge": "config.admin_site.badge_pending_moderation",
                        "badge_variant": "warning",
                    },
                    {
                        "title": _("Listing reports"),
                        "icon": "flag",
                        "link": reverse_lazy("kedi_admin:marketplace_listingreport_changelist"),
                    },
                    {
                        "title": _("Verifications"),
                        "icon": "verified_user",
                        "link": reverse_lazy("kedi_admin:accounts_verificationrequest_changelist"),
                        "badge": "config.admin_site.badge_pending_verifications",
                        "badge_variant": "warning",
                    },
                ],
            },
            {
                "title": _("Platform"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Brand & settings"),
                        "icon": "settings",
                        "link": reverse_lazy("kedi_admin:siteplatform_sitesetting_changelist"),
                    },
                    {
                        "title": _("Member inbox"),
                        "icon": "inbox",
                        "link": reverse_lazy("kedi_admin:siteplatform_notification_changelist"),
                    },
                    {
                        "title": _("Activity log"),
                        "icon": "receipt_long",
                        "link": reverse_lazy("kedi_admin:siteplatform_auditlog_changelist"),
                    },
                ],
            },
        ],
    },
    "TABS": [
        {
            "models": ["shop.product", "shop.productcategory", "shop.productreview"],
            "items": [
                {
                    "title": _("Products"),
                    "link": reverse_lazy("kedi_admin:shop_product_changelist"),
                },
                {
                    "title": _("Categories"),
                    "link": reverse_lazy("kedi_admin:shop_productcategory_changelist"),
                },
                {
                    "title": _("Reviews"),
                    "link": reverse_lazy("kedi_admin:shop_productreview_changelist"),
                },
            ],
        },
        {
            "models": [
                "shop.order",
                "shop.vendorpayout",
                "shop.vendorledgerentry",
                "shop.commissionplan",
            ],
            "items": [
                {
                    "title": _("Orders"),
                    "link": reverse_lazy("kedi_admin:shop_order_changelist"),
                },
                {
                    "title": _("Payouts"),
                    "link": reverse_lazy("kedi_admin:shop_vendorpayout_changelist"),
                },
                {
                    "title": _("Ledger"),
                    "link": reverse_lazy("kedi_admin:shop_vendorledgerentry_changelist"),
                },
                {
                    "title": _("Commission"),
                    "link": reverse_lazy("kedi_admin:shop_commissionplan_changelist"),
                },
            ],
        },
        {
            "models": ["accounts.user", "accounts.vendorprofile"],
            "items": [
                {
                    "title": _("Users"),
                    "link": reverse_lazy("kedi_admin:accounts_user_changelist"),
                },
                {
                    "title": _("Vendors"),
                    "link": reverse_lazy("kedi_admin:accounts_vendorprofile_changelist"),
                },
            ],
        },
        {
            "models": [
                "siteplatform.moderationqueue",
                "marketplace.listingreport",
                "accounts.verificationrequest",
            ],
            "items": [
                {
                    "title": _("Review queue"),
                    "link": reverse_lazy("kedi_admin:siteplatform_moderationqueue_changelist"),
                },
                {
                    "title": _("Listing reports"),
                    "link": reverse_lazy("kedi_admin:marketplace_listingreport_changelist"),
                },
                {
                    "title": _("Verifications"),
                    "link": reverse_lazy("kedi_admin:accounts_verificationrequest_changelist"),
                },
            ],
        },
        {
            "models": [
                "siteplatform.sitesetting",
                "siteplatform.notification",
                "siteplatform.auditlog",
            ],
            "items": [
                {
                    "title": _("Brand & settings"),
                    "link": reverse_lazy("kedi_admin:siteplatform_sitesetting_changelist"),
                },
                {
                    "title": _("Member inbox"),
                    "link": reverse_lazy("kedi_admin:siteplatform_notification_changelist"),
                },
                {
                    "title": _("Activity log"),
                    "link": reverse_lazy("kedi_admin:siteplatform_auditlog_changelist"),
                },
            ],
        },
    ],
}
