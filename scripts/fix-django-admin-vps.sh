# Kedi Smart — restore working Django Unfold at /django-admin/
# Paste into SSH on sas-server. Do not kill BusinessBooks on :8001.

set -euo pipefail
APP=~/Kedi_Smart
cd "$APP/backend"
source .venv/bin/activate

echo "==> Patch settings: admin prefix + drop Next.js login hijack"
python <<'PY'
from pathlib import Path

# settings.py — ensure production admin prefix + proxy SSL + no SSO middleware
settings = Path("config/settings.py")
text = settings.read_text()
text = text.replace(
    '"config.middleware.AdminFrontendLoginMiddleware",\n    ',
    "",
)
if "DJANGO_ADMIN_URL_PREFIX" not in text:
    needle = 'FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")\n'
    insert = needle + '''_admin_prefix_env = os.environ.get("DJANGO_ADMIN_URL_PREFIX")
DJANGO_ADMIN_URL_PREFIX = (
    _admin_prefix_env if _admin_prefix_env is not None else ("admin" if DEBUG else "django-admin")
).strip("/")
DJANGO_ADMIN_PUBLIC_PATH = os.environ.get(
    "DJANGO_ADMIN_PUBLIC_PATH",
    f"/{DJANGO_ADMIN_URL_PREFIX}/",
)
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
'''
    if needle not in text:
        raise SystemExit("FRONTEND_URL line not found in settings")
    text = text.replace(needle, insert, 1)
settings.write_text(text)
print("settings patched")

# urls.py — mount admin at DJANGO_ADMIN_URL_PREFIX
Path("config/urls.py").write_text('''from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from api.views import root
from config.admin_site import kedi_admin_site

_admin = settings.DJANGO_ADMIN_URL_PREFIX.strip("/")

urlpatterns = [
    path(f"{_admin}/", kedi_admin_site.urls),
    path("", root.index, name="index"),
    path("health", root.health, name="health"),
    path("api/v1/", include("api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
''')
print("urls.py written")

# admin_site.py — Unfold native login
admin_site = Path("config/admin_site.py")
at = admin_site.read_text()
old = '''    def login(self, request, extra_context=None):
        """Single sign-on: Django admin login always uses the frontend login page."""
        user = getattr(request, "user", None)
        if user and user.is_authenticated and getattr(user, "is_staff", False):
            next_url = request.GET.get("next") or "/admin/"
            if next_url.startswith("/admin"):
                return HttpResponseRedirect(next_url)
            return HttpResponseRedirect("/admin/")
        return HttpResponseRedirect(frontend_login_url())
'''
new = '''    def login(self, request, extra_context=None):
        """Use Unfold/Django login form (email + password)."""
        return super().login(request, extra_context=extra_context)
'''
if old in at:
    admin_site.write_text(at.replace(old, new))
    print("admin_site login restored")
elif "super().login" in at:
    print("admin_site already OK")
else:
    print("WARN: admin_site login block not matched — check manually")

# auth redirects → django-admin
auth = Path("api/views/auth.py")
at = auth.read_text()
at2 = at.replace(
    'f"{settings.APP_URL.rstrip(\'/\' )}/admin/"'.replace("' )", "')"),
    'f"{settings.APP_URL.rstrip(\'/\')}/django-admin/"',
)
at2 = at2.replace(
    'f"{settings.APP_URL.rstrip(\'/\')}/admin/"',
    'f"{settings.APP_URL.rstrip(\'/\')}/django-admin/"',
)
auth.write_text(at2)
print("auth redirects checked")
PY

# .env
grep -q '^DJANGO_ADMIN_URL_PREFIX=' .env 2>/dev/null \
  || echo 'DJANGO_ADMIN_URL_PREFIX=django-admin' >> .env
grep -q '^DJANGO_ADMIN_PUBLIC_PATH=' .env 2>/dev/null \
  || echo 'DJANGO_ADMIN_PUBLIC_PATH=/django-admin/' >> .env
# ensure values
sed -i 's/^DJANGO_ADMIN_URL_PREFIX=.*/DJANGO_ADMIN_URL_PREFIX=django-admin/' .env
sed -i 's/^DJANGO_ADMIN_PUBLIC_PATH=.*/DJANGO_ADMIN_PUBLIC_PATH=\/django-admin\//' .env

echo "==> collectstatic"
python manage.py collectstatic --noinput >/dev/null

echo "==> Write nginx site (port 8002, django-admin unstripped)"
sudo tee /etc/nginx/sites-available/kedismart >/dev/null <<'NGINX'
server {
    listen 127.0.0.1:82;
    listen [::1]:82;
    server_name kedismart.sascorporationbd.com;
    client_max_body_size 25m;

    location /api/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }
    location = /health {
        proxy_pass http://127.0.0.1:8002/health;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
    }
    location /static/ {
        alias /home/sas/Kedi_Smart/backend/staticfiles/;
        access_log off;
        expires 7d;
    }
    location /django-admin/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_redirect http://$host:82/ https://$host/;
        proxy_cookie_path / /;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
sudo nginx -t && sudo systemctl reload nginx

echo "==> Restart Kedi gunicorn on :8002 only"
pkill -f "/home/sas/Kedi_Smart/backend/.venv/bin/gunicorn config.wsgi" 2>/dev/null || true
pkill -f "gunicorn config.wsgi:application --bind 127.0.0.1:8002" 2>/dev/null || true
sleep 1
# ensure run-backend uses 8002
sed -i 's/127.0.0.1:8001/127.0.0.1:8002/g' "$HOME/.config/kedismart/run-backend.sh"
nohup "$HOME/.config/kedismart/run-backend.sh" > "$HOME/.config/kedismart/backend.log" 2>&1 &
sleep 3

echo "==> Verify"
ss -tlnp | grep -E '8002|8001|82' || true
echo -n "direct django-admin: "; curl -sI http://127.0.0.1:8002/django-admin/ | head -1
echo -n "nginx django-admin:  "; curl -sI http://127.0.0.1:82/django-admin/ | head -1
echo -n "has Unfold title?:   "; curl -s http://127.0.0.1:82/django-admin/login/ 2>/dev/null | grep -oE 'Unfold|Django administration|Log in|Kedi' | head -5
echo "Done. Open: https://kedismart.sascorporationbd.com/django-admin/"
echo "Login: admin@kedismart.com / admin123"
