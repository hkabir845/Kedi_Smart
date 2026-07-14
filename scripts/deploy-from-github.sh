#!/usr/bin/env bash
# Deploy Kedi Smart from GitHub onto a VPS (Django + Next.js + SQLite).
# Usage (on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/hkabir845/Kedi_Smart/main/scripts/deploy-from-github.sh | bash
# or after clone:
#   bash scripts/deploy-from-github.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hkabir845/Kedi_Smart.git}"
APP_DIR="${APP_DIR:-$HOME/Kedi_Smart}"
PUBLIC_HOST="${PUBLIC_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
PUBLIC_HOST="${PUBLIC_HOST:-192.168.68.105}"
# 8001 is taken by BusinessBooks (fsms) on sas-server — keep Kedi on 8002
BACKEND_PORT="${BACKEND_PORT:-8002}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
NGINX_PORT="${NGINX_PORT:-82}"
PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-kedismart.sascorporationbd.com}"

echo "==> Host: $PUBLIC_HOST"
echo "==> App dir: $APP_DIR"
echo "==> Single public origin via nginx :${NGINX_PORT} (like GAIMS :80)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }; }

need git
need python3
need npm

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "==> Cloning $REPO_URL"
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "==> Pulling latest from origin/main"
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout main
  git -C "$APP_DIR" pull --ff-only origin main
fi

cd "$APP_DIR"

# --- Backend ---
echo "==> Backend setup"
cd "$APP_DIR/backend"
python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

mkdir -p data uploads staticfiles

# Preserve existing .env on redeploy (never rotate SECRET_KEY mid-flight).
if [[ ! -f .env ]]; then
  SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  cat > .env <<EOF
SECRET_KEY=${SECRET}
DEBUG=False
ALLOWED_HOSTS=${PUBLIC_DOMAIN},${PUBLIC_HOST},localhost,127.0.0.1
BACKEND_CORS_ORIGINS=https://${PUBLIC_DOMAIN},http://${PUBLIC_HOST}:${FRONTEND_PORT},http://${PUBLIC_HOST}:${NGINX_PORT}
CSRF_TRUSTED_ORIGINS=https://${PUBLIC_DOMAIN},http://${PUBLIC_HOST}:${FRONTEND_PORT},http://${PUBLIC_HOST}:${NGINX_PORT},http://${PUBLIC_HOST}:${BACKEND_PORT}
APP_URL=https://${PUBLIC_DOMAIN}
FRONTEND_URL=https://${PUBLIC_DOMAIN}
DJANGO_ADMIN_URL_PREFIX=django-admin
DJANGO_ADMIN_PUBLIC_PATH=/django-admin/
EOF
  echo "==> Wrote new backend/.env"
else
  echo "==> Keeping existing backend/.env"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Seed only if no users yet (best-effort)
if ! python manage.py shell -c "from accounts.models import User; raise SystemExit(0 if User.objects.exists() else 1)"; then
  echo "==> Seeding demo data"
  python ../scripts/seed_demo.py || true
fi

mkdir -p "$HOME/.config/kedismart"
cat > "$HOME/.config/kedismart/backend.env" <<EOF
$(cat .env)
EOF

# --- Frontend ---
echo "==> Frontend setup"
cd "$APP_DIR/frontend"
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_URL=http://127.0.0.1:${BACKEND_PORT}
EOF
npm ci || npm install
npm run build

cat > "$HOME/.config/kedismart/run-frontend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/frontend"
# Bind localhost only — nginx (:${NGINX_PORT}) is the public door (Cloudflare → nginx).
exec env BACKEND_URL=http://127.0.0.1:${BACKEND_PORT} npx next start -H 127.0.0.1 -p ${FRONTEND_PORT}
EOF
chmod +x "$HOME/.config/kedismart/run-frontend.sh"

# --- Restart processes ---
echo "==> Starting services"
pkill -f "gunicorn config.wsgi" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1

# Bind backend to localhost only (nginx proxies)
cat > "$HOME/.config/kedismart/run-backend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/backend"
set -a
source .env
source .venv/bin/activate
set +a
exec gunicorn config.wsgi:application --bind 127.0.0.1:${BACKEND_PORT} --workers 2
EOF
chmod +x "$HOME/.config/kedismart/run-backend.sh"

nohup "$HOME/.config/kedismart/run-backend.sh" > "$HOME/.config/kedismart/backend.log" 2>&1 &
nohup "$HOME/.config/kedismart/run-frontend.sh" > "$HOME/.config/kedismart/frontend.log" 2>&1 &

sleep 4
if ss -tln | grep -q ":${FRONTEND_PORT} "; then
  echo "Frontend is listening on 127.0.0.1:${FRONTEND_PORT}"
else
  echo "WARNING: Frontend did not bind to :${FRONTEND_PORT}. Log:"
  tail -n 30 "$HOME/.config/kedismart/frontend.log" || true
fi

# nginx single-origin door
if command -v nginx >/dev/null 2>&1; then
  echo "==> Installing/reloading nginx site on :${NGINX_PORT}"
  bash "$APP_DIR/scripts/install-nginx-kedismart.sh" || true
else
  echo "WARNING: nginx not installed. Install with: sudo apt install -y nginx"
  echo "Then: bash $APP_DIR/scripts/install-nginx-kedismart.sh"
fi

echo ""
echo "Deployed from GitHub (single public origin)."
echo "  Cloudflare service URL: http://127.0.0.1:${NGINX_PORT}"
echo "  Public site:            https://${PUBLIC_DOMAIN}"
echo "  Health (via nginx):     http://127.0.0.1:${NGINX_PORT}/health"
echo "  Django Unfold:          https://${PUBLIC_DOMAIN}/django-admin/"
echo "  Logs:                   ~/.config/kedismart/*.log"
echo ""
echo "Redeploy later:"
echo "  cd $APP_DIR && git pull && bash scripts/deploy-from-github.sh"
