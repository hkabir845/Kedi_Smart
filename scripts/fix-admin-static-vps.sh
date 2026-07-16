#!/usr/bin/env bash
# Fix unstyled Django Unfold admin (nginx 403 on /static/ from home-dir alias).
# On VPS:
#   bash ~/Kedi_Smart/scripts/fix-admin-static-vps.sh
set -euo pipefail

APP="${APP:-$HOME/Kedi_Smart}"
BACKEND="$APP/backend"
NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/kedismart}"

cd "$BACKEND"
# shellcheck disable=SC1091
source .venv/bin/activate

echo "==> Install WhiteNoise"
pip install -q 'whitenoise>=6.6'
grep -q '^whitenoise' requirements.txt 2>/dev/null || echo 'whitenoise>=6.6' >> requirements.txt

echo "==> Patch settings for WhiteNoise (idempotent)"
python <<'PY'
from pathlib import Path

settings = Path("config/settings.py")
text = settings.read_text()
changed = False

if "whitenoise.middleware.WhiteNoiseMiddleware" not in text:
    needle = '"django.middleware.security.SecurityMiddleware",\n'
    if needle not in text:
        raise SystemExit("SecurityMiddleware not found in settings.py")
    text = text.replace(
        needle,
        needle + '    "whitenoise.middleware.WhiteNoiseMiddleware",\n',
        1,
    )
    changed = True

if "whitenoise.storage" not in text:
    needle = 'STATICFILES_DIRS = [BASE_DIR / "static"]\n'
    if needle not in text:
        raise SystemExit("STATICFILES_DIRS not found in settings.py")
    text = text.replace(
        needle,
        needle
        + "STORAGES = {\n"
        + '    "default": {\n'
        + '        "BACKEND": "django.core.files.storage.FileSystemStorage",\n'
        + "    },\n"
        + '    "staticfiles": {\n'
        + '        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",\n'
        + "    },\n"
        + "}\n",
        1,
    )
    changed = True

settings.write_text(text) if changed else None
print("settings.py patched" if changed else "settings.py already OK")
PY

echo "==> collectstatic"
mkdir -p staticfiles static
python manage.py collectstatic --noinput
echo "staticfiles count: $(find staticfiles -type f | wc -l)"
find staticfiles -path '*unfold*' -name '*.css' | head -3 || echo "WARN: no unfold css found"
chmod o+x "$HOME" "$APP" "$BACKEND" 2>/dev/null || true
chmod -R a+rX staticfiles 2>/dev/null || true

echo "==> nginx /static/ → proxy gunicorn (WhiteNoise)"
if [[ -f "$NGINX_SITE" ]]; then
  sudo python3 - <<'PY'
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
    print("replaced /static/ → proxy WhiteNoise")
elif "location /static/" not in t:
    needle = "    location / {"
    if needle not in t:
        raise SystemExit("Could not find location / in nginx site")
    p.write_text(t.replace(needle, block + "\n\n" + needle, 1))
    print("inserted /static/ proxy block")
else:
    print("could not update /static/; leaving as-is")
PY
  sudo nginx -t
  sudo systemctl reload nginx
  echo "nginx reloaded"
else
  echo "WARN: $NGINX_SITE missing — relying on WhiteNoise only"
fi

echo "==> Restart gunicorn :8002"
mkdir -p "$HOME/.config/kedismart"
pkill -f "gunicorn config.wsgi:application --bind 127.0.0.1:8002" 2>/dev/null || true
pkill -f "/home/sas/Kedi_Smart/backend/.venv/bin/gunicorn config.wsgi" 2>/dev/null || true
sleep 1
if [[ -x "$HOME/.config/kedismart/run-backend.sh" ]]; then
  nohup "$HOME/.config/kedismart/run-backend.sh" >"$HOME/.config/kedismart/backend.log" 2>&1 &
else
  set -a
  # shellcheck disable=SC1091
  [[ -f .env ]] && source .env
  set +a
  nohup "$BACKEND/.venv/bin/gunicorn" config.wsgi:application \
    --bind 127.0.0.1:8002 --workers 2 --timeout 120 \
    >"$HOME/.config/kedismart/backend.log" 2>&1 &
fi
sleep 3

echo "==> Verify"
SAMPLE=$(find "$BACKEND/staticfiles" -name 'styles.css' | head -1 || true)
[[ -z "$SAMPLE" ]] && SAMPLE=$(find "$BACKEND/staticfiles" -name '*.css' | head -1 || true)
if [[ -n "$SAMPLE" ]]; then
  REL=${SAMPLE#"$BACKEND/staticfiles/"}
  echo -n "gunicorn /static/${REL}: "
  curl -sI "http://127.0.0.1:8002/static/${REL}" | head -1
  echo -n "nginx   /static/${REL}: "
  curl -sI "http://127.0.0.1:82/static/${REL}" | head -1 || true
fi
echo "Hard-refresh https://kedismart.com/django-admin/"
