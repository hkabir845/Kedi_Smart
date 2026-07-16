#!/usr/bin/env bash
# Force-restore real Django admin at /django-admin/ (not Next.js /login).
# Paste on sas-server SSH. Leaves BusinessBooks on :8001 alone.
set -euo pipefail

APP="${APP_DIR:-$HOME/Kedi_Smart}"
cd "$APP"

echo "==> Discard VPS local drift and sync GitHub main"
git fetch origin
git checkout main
git reset --hard origin/main
git clean -fd --exclude=backend/data --exclude=backend/uploads --exclude=backend/.env --exclude=frontend/.env.local --exclude=backend/.venv

cd "$APP/backend"
source .venv/bin/activate
pip install -q -r requirements.txt gunicorn

# Keep existing secrets; only ensure admin path vars
touch .env
grep -q '^DJANGO_ADMIN_URL_PREFIX=' .env 2>/dev/null \
  || echo 'DJANGO_ADMIN_URL_PREFIX=django-admin' >> .env
grep -q '^DJANGO_ADMIN_PUBLIC_PATH=' .env 2>/dev/null \
  || echo 'DJANGO_ADMIN_PUBLIC_PATH=/django-admin/' >> .env
sed -i 's/^DJANGO_ADMIN_URL_PREFIX=.*/DJANGO_ADMIN_URL_PREFIX=django-admin/' .env
sed -i 's|^DJANGO_ADMIN_PUBLIC_PATH=.*|DJANGO_ADMIN_PUBLIC_PATH=/django-admin/|' .env
# Never force Next.js SSO onto Django admin
sed -i '/AdminFrontendLoginMiddleware/d' config/settings.py || true

set -a
# shellcheck disable=SC1091
source .env
set +a

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py create_admin --email admin@kedismart.com --password admin123

mkdir -p "$HOME/.config/kedismart"
cat > "$HOME/.config/kedismart/run-backend.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$HOME/Kedi_Smart/backend"
set -a
source .env
source .venv/bin/activate
set +a
# 8001 = BusinessBooks — Kedi must stay on 8002
exec gunicorn config.wsgi:application --bind 127.0.0.1:8002 --workers 2 --timeout 120
EOF
chmod +x "$HOME/.config/kedismart/run-backend.sh"

echo "==> nginx single-origin door"
bash "$APP/scripts/install-nginx-kedismart.sh" || true

echo "==> Restart ONLY Kedi gunicorn on :8002"
# Do not pkill all gunicorn — BusinessBooks also uses gunicorn on :8001
pkill -f "gunicorn config.wsgi:application --bind 127.0.0.1:8002" 2>/dev/null || true
pkill -f "/home/sas/Kedi_Smart/backend/.venv/bin/gunicorn" 2>/dev/null || true
sleep 2
nohup "$HOME/.config/kedismart/run-backend.sh" >"$HOME/.config/kedismart/backend.log" 2>&1 &
sleep 3

echo "==> Verify"
ss -tlnp | grep -E ':8002|:8001|:82|:3000' || true
echo "--- direct login ---"
curl -sI "http://127.0.0.1:8002/django-admin/login/" | head -8
echo "--- nginx login ---"
curl -sI "http://127.0.0.1:82/django-admin/login/" | head -8
echo "--- page markers (expect Log in / csrf; NOT 'Sign in to KediSmart') ---"
curl -sS "http://127.0.0.1:8002/django-admin/login/" \
  | grep -oE 'Sign in to KediSmart|Django administration|Log in|csrfmiddlewaretoken|Unfold|Kedi Smart' \
  | sort | uniq
echo
echo "Open: https://kedismart.com/django-admin/"
echo "Login: admin@kedismart.com / admin123"
echo "If still redirects: tail -n 80 ~/.config/kedismart/backend.log"
