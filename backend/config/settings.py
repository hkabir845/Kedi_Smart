import os
from pathlib import Path

from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

BASE_DIR = Path(__file__).resolve().parent.parent

# Load backend/.env when present (local PC / VPS). Missing file = keep process env + defaults.
_env_file = BASE_DIR / ".env"
if _env_file.exists():
    for _raw in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _raw.strip()
        if not _line or _line.startswith("#") or "=" not in _line:
            continue
        _key, _val = _line.split("=", 1)
        _key = _key.strip()
        _val = _val.strip().strip('"').strip("'")
        os.environ.setdefault(_key, _val)

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
    # Serve Unfold/admin CSS when nginx or DEBUG=False would otherwise 404 /static/
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    # Intentionally no AdminFrontendLoginMiddleware — Unfold serves its own login at
    # /django-admin/ (Next.js owns /admin for the vendor UI).
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
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}
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
# URL mount for Unfold. Production nginx uses /django-admin/ (Next.js owns /admin).
_admin_prefix_env = os.environ.get("DJANGO_ADMIN_URL_PREFIX")
DJANGO_ADMIN_URL_PREFIX = (
    _admin_prefix_env if _admin_prefix_env is not None else ("admin" if DEBUG else "django-admin")
).strip("/")
DJANGO_ADMIN_PUBLIC_PATH = os.environ.get(
    "DJANGO_ADMIN_PUBLIC_PATH",
    f"/{DJANGO_ADMIN_URL_PREFIX}/",
)
API_V1_STR = "/api/v1"

# Cloudflare Tunnel → nginx is HTTP; public clients are HTTPS
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    CSRF_TRUSTED_ORIGINS = list(
        {
            *CSRF_TRUSTED_ORIGINS,
            APP_URL.rstrip("/"),
            FRONTEND_URL.rstrip("/"),
        }
    )
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
    "SITE_SUBHEADER": "Operations console",
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
            "title": _("Ops dashboard"),
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
    "LOGIN": {
        "form": "config.admin_forms.KediAdminAuthenticationForm",
    },
    # All navigation lives in the left sidebar only — no content-area TABS or app lists.
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
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
                        "title": _("Payments (approval)"),
                        "icon": "payments",
                        "link": reverse_lazy("kedi_admin:shop_payment_changelist"),
                    },
                    {
                        "title": _("Invoices"),
                        "icon": "request_quote",
                        "link": reverse_lazy("kedi_admin:shop_invoice_changelist"),
                    },
                    {
                        "title": _("Receipts"),
                        "icon": "receipt_long",
                        "link": reverse_lazy("kedi_admin:shop_receipt_changelist"),
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
                    {
                        "title": _("Carts"),
                        "icon": "shopping_cart",
                        "link": reverse_lazy("kedi_admin:shop_cart_changelist"),
                    },
                    {
                        "title": _("Cart items"),
                        "icon": "shopping_basket",
                        "link": reverse_lazy("kedi_admin:shop_cartitem_changelist"),
                    },
                    {
                        "title": _("Subscription plans"),
                        "icon": "card_membership",
                        "link": reverse_lazy("kedi_admin:shop_subscriptionplan_changelist"),
                    },
                    {
                        "title": _("Subscriptions"),
                        "icon": "autorenew",
                        "link": reverse_lazy("kedi_admin:shop_subscription_changelist"),
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
                "title": _("Pets"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Pet passports"),
                        "icon": "badge",
                        "link": reverse_lazy("kedi_admin:pets_pet_changelist"),
                    },
                    {
                        "title": _("Pet photos"),
                        "icon": "photo_library",
                        "link": reverse_lazy("kedi_admin:pets_petphoto_changelist"),
                    },
                    {
                        "title": _("Vaccinations"),
                        "icon": "vaccines",
                        "link": reverse_lazy("kedi_admin:pets_vaccination_changelist"),
                    },
                    {
                        "title": _("Medical records"),
                        "icon": "medical_information",
                        "link": reverse_lazy("kedi_admin:pets_petmedicalrecord_changelist"),
                    },
                    {
                        "title": _("Prescriptions"),
                        "icon": "medication",
                        "link": reverse_lazy("kedi_admin:pets_prescription_changelist"),
                    },
                    {
                        "title": _("Health reminders"),
                        "icon": "notifications_active",
                        "link": reverse_lazy("kedi_admin:pets_pethealthreminder_changelist"),
                    },
                ],
            },
            {
                "title": _("NFC & lost/found"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("NFC tags"),
                        "icon": "nfc",
                        "link": reverse_lazy("kedi_admin:nfc_nfctag_changelist"),
                    },
                    {
                        "title": _("Tag activations"),
                        "icon": "qr_code_scanner",
                        "link": reverse_lazy("kedi_admin:nfc_tagactivation_changelist"),
                    },
                    {
                        "title": _("Lost pets"),
                        "icon": "sos",
                        "link": reverse_lazy("kedi_admin:nfc_lostpetreport_changelist"),
                        "badge": "config.admin_site.badge_active_lost",
                        "badge_variant": "danger",
                    },
                    {
                        "title": _("Found reports"),
                        "icon": "person_search",
                        "link": reverse_lazy("kedi_admin:nfc_foundreport_changelist"),
                    },
                    {
                        "title": _("Masked chat threads"),
                        "icon": "forum",
                        "link": reverse_lazy("kedi_admin:nfc_maskedmessagethread_changelist"),
                    },
                    {
                        "title": _("Masked messages"),
                        "icon": "chat_bubble",
                        "link": reverse_lazy("kedi_admin:nfc_maskedmessage_changelist"),
                    },
                ],
            },
            {
                "title": _("Vet network"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Clinics"),
                        "icon": "local_hospital",
                        "link": reverse_lazy("kedi_admin:vets_vetprofile_changelist"),
                    },
                    {
                        "title": _("Appointments"),
                        "icon": "event",
                        "link": reverse_lazy("kedi_admin:vets_appointment_changelist"),
                        "badge": "config.admin_site.badge_open_appointments",
                        "badge_variant": "info",
                    },
                    {
                        "title": _("Availability"),
                        "icon": "schedule",
                        "link": reverse_lazy("kedi_admin:vets_vetavailability_changelist"),
                    },
                    {
                        "title": _("Consultation notes"),
                        "icon": "clinical_notes",
                        "link": reverse_lazy("kedi_admin:vets_consultationnote_changelist"),
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
                        "icon": "cruelty_free",
                        "link": reverse_lazy("kedi_admin:marketplace_petlisting_changelist"),
                        "badge": "config.admin_site.badge_pending_listings",
                        "badge_variant": "warning",
                    },
                    {
                        "title": _("Listing photos"),
                        "icon": "image",
                        "link": reverse_lazy("kedi_admin:marketplace_listingphoto_changelist"),
                    },
                    {
                        "title": _("Listing reports"),
                        "icon": "flag",
                        "link": reverse_lazy("kedi_admin:marketplace_listingreport_changelist"),
                    },
                ],
            },
            {
                "title": _("Knowledge & blog"),
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": _("Care guides"),
                        "icon": "menu_book",
                        "link": reverse_lazy("kedi_admin:content_contenttopic_changelist"),
                    },
                    {
                        "title": _("Animal categories"),
                        "icon": "category",
                        "link": reverse_lazy("kedi_admin:content_animalcategory_changelist"),
                    },
                    {
                        "title": _("Content tags"),
                        "icon": "label",
                        "link": reverse_lazy("kedi_admin:content_contenttag_changelist"),
                    },
                    {
                        "title": _("FAQs"),
                        "icon": "quiz",
                        "link": reverse_lazy("kedi_admin:content_faqitem_changelist"),
                    },
                    {
                        "title": _("Blog posts"),
                        "icon": "rss_feed",
                        "link": reverse_lazy("kedi_admin:blog_blogpost_changelist"),
                    },
                    {
                        "title": _("Comments"),
                        "icon": "chat",
                        "link": reverse_lazy("kedi_admin:blog_blogcomment_changelist"),
                    },
                    {
                        "title": _("SEO"),
                        "icon": "travel_explore",
                        "link": reverse_lazy("kedi_admin:content_seosetting_changelist"),
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
                    {
                        "title": _("Vendors"),
                        "icon": "store",
                        "link": reverse_lazy("kedi_admin:accounts_vendorprofile_changelist"),
                    },
                    {
                        "title": _("Refresh tokens"),
                        "icon": "key",
                        "link": reverse_lazy("kedi_admin:accounts_refreshtoken_changelist"),
                    },
                    {
                        "title": _("Password reset tokens"),
                        "icon": "password",
                        "link": reverse_lazy("kedi_admin:accounts_passwordresettoken_changelist"),
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
    "TABS": [],
}
