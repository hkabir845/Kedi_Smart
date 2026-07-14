#!/usr/bin/env bash
# Paste this entire block into SSH on sas-server (already logged in as sas).
# Fixes unstyled Unfold admin: nginx was 403'ing /static/ (home-dir alias).
# Serves /static/ through gunicorn + WhiteNoise instead.

set -euo pipefail
APP="$HOME/Kedi_Smart"
BACKEND="$APP/backend"
cd "$BACKEND"
source .venv/bin/activate

pip install -q 'whitenoise>=6.6'
grep -q '^whitenoise' requirements.txt 2>/dev/null || echo 'whitenoise>=6.6' >> requirements.txt

python <<'PY'
from pathlib import Path
settings = Path("config/settings.py")
text = settings.read_text()
changed = False
if "whitenoise.middleware.WhiteNoiseMiddleware" not in text:
    needle = '"django.middleware.security.SecurityMiddleware",\n'
    if needle not in text:
        raise SystemExit("SecurityMiddleware not found")
    text = text.replace(needle, needle + '    "whitenoise.middleware.WhiteNoiseMiddleware",\n', 1)
    changed = True
if "whitenoise.storage" not in text:
    needle = 'STATICFILES_DIRS = [BASE_DIR / "static"]\n'
    if needle not in text:
        raise SystemExit("STATICFILES_DIRS not found")
    text = text.replace(
        needle,
        needle
        + "STORAGES = {\n"
        + '    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},\n'
        + '    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},\n'
        + "}\n",
        1,
    )
    changed = True
if changed:
    settings.write_text(text)
print("settings:", "patched" if changed else "already OK")
PY

mkdir -p staticfiles static
python manage.py collectstatic --noinput
echo "files: $(find staticfiles -type f | wc -l)"
# Allow traverse if anything still reads from disk later
chmod o+x "$HOME" "$APP" "$BACKEND" 2>/dev/null || true
chmod -R a+rX staticfiles 2>/dev/null || true

NGINX=/etc/nginx/sites-available/kedismart
if [[ -f "$NGINX" ]]; then
  sudo python3 <<'PY'
from pathlib import Path
import re
p = Path("/etc/nginx/sites-available/kedismart")
t = p.read_text()
block = """    location /static/ {
        proxy_pass http://127.0.0.1:8002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        access_log off;
        expires 7d;
    }"""
new, n = re.subn(r"[ \t]*location /static/ \{.*?\n[ \t]*\}", block, t, count=1, flags=re.S)
if n:
    p.write_text(new)
    print("nginx /static/ → proxy WhiteNoise")
elif "location /static/" not in t:
    needle = "    location / {"
    if needle not in t:
        raise SystemExit("no location / in nginx")
    p.write_text(t.replace(needle, block + "\n\n" + needle, 1))
    print("nginx /static/ inserted (proxy)")
else:
    print("nginx /static/ untouched")
PY
  sudo nginx -t && sudo systemctl reload nginx
fi

mkdir -p "$HOME/.config/kedismart"
pkill -f "gunicorn config.wsgi:application --bind 127.0.0.1:8002" 2>/dev/null || true
pkill -f "/home/sas/Kedi_Smart/backend/.venv/bin/gunicorn config.wsgi" 2>/dev/null || true
sleep 1
if [[ -x "$HOME/.config/kedismart/run-backend.sh" ]]; then
  nohup "$HOME/.config/kedismart/run-backend.sh" >"$HOME/.config/kedismart/backend.log" 2>&1 &
else
  set -a; source .env; set +a
  nohup .venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8002 --workers 2 --timeout 120 \
    >"$HOME/.config/kedismart/backend.log" 2>&1 &
fi
sleep 3

SAMPLE=$(find staticfiles -name '*.css' | head -1)
REL=${SAMPLE#staticfiles/}
echo -n "gunicorn: "; curl -sI "http://127.0.0.1:8002/static/$REL" | head -1
echo -n "nginx:    "; curl -sI "http://127.0.0.1:82/static/$REL" | head -1 || true
echo "Done — hard refresh https://kedismart.sascorporationbd.com/django-admin/"
