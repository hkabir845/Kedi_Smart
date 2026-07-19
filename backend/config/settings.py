import os
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from django.core.exceptions import ImproperlyConfigured
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
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
if not DEBUG and SECRET_KEY == "change-this-secret-key-in-production":
    raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG=False")
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if h.strip()
]

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

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL.startswith(("postgres://", "postgresql://")):
    _db = urlparse(DATABASE_URL)
    _db_query = parse_qs(_db.query)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _db.path.lstrip("/"),
            "USER": _db.username or "",
            "PASSWORD": _db.password or "",
            "HOST": _db.hostname or "localhost",
            "PORT": str(_db.port or 5432),
            "CONN_MAX_AGE": int(os.environ.get("DB_CONN_MAX_AGE", "60")),
            "CONN_HEALTH_CHECKS": True,
            "OPTIONS": {
                **(
                    {"sslmode": _db_query["sslmode"][0]}
                    if _db_query.get("sslmode")
                    else {}
                )
            },
        }
    }
elif not DATABASE_URL or DATABASE_URL.startswith("sqlite:///"):
    _sqlite_name = BASE_DIR / "data" / "kedismart.db"
    if DATABASE_URL.startswith("sqlite:///"):
        _sqlite_value = DATABASE_URL.removeprefix("sqlite:///").split("?", 1)[0]
        if _sqlite_value:
            _sqlite_path = Path(_sqlite_value)
            _sqlite_name = _sqlite_path if _sqlite_path.is_absolute() else BASE_DIR / _sqlite_path
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": _sqlite_name,
        }
    }
else:
    raise ImproperlyConfigured("DATABASE_URL must use PostgreSQL or SQLite")

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

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
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "auth_sensitive": "5/min",
    },
    "UNAUTHENTICATED_USER": None,
}

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "BACKEND_CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001",
    ).split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://localhost:8000",
    ).split(",")
    if o.strip()
]

APP_NAME = "Kedi Smart"
APP_URL = os.environ.get("APP_URL", "http://localhost:8000").rstrip("/")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Keep storefront ↔ API working whether .env CORS list drifted from FRONTEND_URL.
for _origin in (FRONTEND_URL, APP_URL):
    if not _origin:
        continue
    if _origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(_origin)
    if _origin.startswith("http") and _origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(_origin)
# Host header must allow the public domain even if ALLOWED_HOSTS was incomplete.
for _url in (FRONTEND_URL, APP_URL):
    if "://" not in (_url or ""):
        continue
    from urllib.parse import urlparse as _urlparse_hosts

    _host = _urlparse_hosts(_url).hostname
    if _host and _host not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_host)

# Email — console in local DEV; SMTP when EMAIL_HOST is set (VPS production)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "").strip()
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() in ("1", "true", "yes")
EMAIL_USE_SSL = os.environ.get("EMAIL_USE_SSL", "false").lower() in ("1", "true", "yes")
EMAIL_TIMEOUT = int(os.environ.get("EMAIL_TIMEOUT", "20"))
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@kedismart.com").strip()
SERVER_EMAIL = os.environ.get("SERVER_EMAIL", DEFAULT_FROM_EMAIL).strip()
_email_backend_override = os.environ.get("EMAIL_BACKEND", "").strip()
if _email_backend_override:
    EMAIL_BACKEND = _email_backend_override
elif EMAIL_HOST:
    # Setting EMAIL_HOST alone is enough for VPS — no need to remember the backend class.
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
# Port 465 uses SSL; 587 uses STARTTLS — don't enable both.
if EMAIL_USE_SSL:
    EMAIL_USE_TLS = False
# Max password-reset OTP emails per account within PASSWORD_RESET_OTP_WINDOW_MINUTES
PASSWORD_RESET_OTP_MAX_PER_WINDOW = int(os.environ.get("PASSWORD_RESET_OTP_MAX_PER_WINDOW", "5"))
PASSWORD_RESET_OTP_WINDOW_MINUTES = int(os.environ.get("PASSWORD_RESET_OTP_WINDOW_MINUTES", "15"))
PASSWORD_RESET_OTP_TTL_MINUTES = int(os.environ.get("PASSWORD_RESET_OTP_TTL_MINUTES", "15"))

# Soft cart stock holds (minutes)
CART_RESERVE_MINUTES = int(os.environ.get("CART_RESERVE_MINUTES", "30"))

# SSLCommerz (card / mobile banking). Leave blank to hide SSLCommerz at checkout.
SSLCOMMERZ_STORE_ID = os.environ.get("SSLCOMMERZ_STORE_ID", "")
SSLCOMMERZ_STORE_PASSWD = os.environ.get("SSLCOMMERZ_STORE_PASSWD", "")
SSLCOMMERZ_SANDBOX = os.environ.get("SSLCOMMERZ_SANDBOX", "true").lower() in ("1", "true", "yes")
# Accidental "/django-admin" (or "/admin") path on APP_URL must not survive URL joins.
if "://" in APP_URL:
    from urllib.parse import urlparse as _urlparse

    _app = _urlparse(APP_URL)
    if _app.path.rstrip("/") in ("/django-admin", "/admin"):
        APP_URL = f"{_app.scheme}://{_app.netloc}"
# URL mount for Unfold. Production nginx uses /django-admin/ (Next.js owns /admin).
_admin_prefix_env = os.environ.get("DJANGO_ADMIN_URL_PREFIX")
DJANGO_ADMIN_URL_PREFIX = (
    _admin_prefix_env if _admin_prefix_env is not None else ("admin" if DEBUG else "django-admin")
).strip("/") or ("admin" if DEBUG else "django-admin")
_raw_admin_public = os.environ.get(
    "DJANGO_ADMIN_PUBLIC_PATH",
    f"/{DJANGO_ADMIN_URL_PREFIX}/",
).strip()
# Never keep a full URL in PUBLIC_PATH — that becomes /https://… after join.
if "://" in _raw_admin_public:
    from urllib.parse import urlparse as _urlparse

    DJANGO_ADMIN_PUBLIC_PATH = _urlparse(_raw_admin_public).path or f"/{DJANGO_ADMIN_URL_PREFIX}/"
else:
    DJANGO_ADMIN_PUBLIC_PATH = (
        _raw_admin_public if _raw_admin_public.startswith("/") else f"/{_raw_admin_public}"
    )
if not DJANGO_ADMIN_PUBLIC_PATH.endswith("/"):
    DJANGO_ADMIN_PUBLIC_PATH = f"{DJANGO_ADMIN_PUBLIC_PATH}/"
API_V1_STR = "/api/v1"

# Cloudflare Tunnel → nginx is HTTP; public clients are HTTPS
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    CSRF_COOKIE_SAMESITE = "Lax"
    SECURE_HSTS_SECONDS = 63072000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
    # TLS is terminated by Cloudflare/nginx; gunicorn is loopback-only and
    # receives X-Forwarded-Proto=https. Redirecting there would break direct
    # localhost health checks without improving public transport security.
    SILENCED_SYSTEM_CHECKS = ["security.W008"]
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
    "SITE_URL": FRONTEND_URL,
    "SITE_SYMBOL": "pets",
    "SITE_DROPDOWN": [
        {
            "icon": "storefront",
            "title": _("Open storefront"),
            "link": FRONTEND_URL,
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
                        "badge": "config.admin_site.badge_invoice_count",
                        "badge_variant": "info",
                    },
                    {
                        "title": _("Receipts"),
                        "icon": "receipt_long",
                        "link": reverse_lazy("kedi_admin:shop_receipt_changelist"),
                        "badge": "config.admin_site.badge_receipt_count",
                        "badge_variant": "info",
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
                        "title": _("Seller ledger"),
                        "icon": "menu_book",
                        "link": reverse_lazy("kedi_admin:shop_vendorledgerentry_changelist"),
                    },
                    {
                        "title": _("Platform ledger"),
                        "icon": "account_balance",
                        "link": reverse_lazy("kedi_admin:shop_platformledgerentry_changelist"),
                    },
                    {
                        "title": _("Expenses & bills"),
                        "icon": "receipt",
                        "link": reverse_lazy("kedi_admin:shop_expensebill_changelist"),
                    },
                    {
                        "title": _("Statements"),
                        "icon": "summarize",
                        "link": reverse_lazy("kedi_admin:shop_vendorstatement_changelist"),
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
