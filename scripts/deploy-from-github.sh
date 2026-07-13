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
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

echo "==> Host: $PUBLIC_HOST"
echo "==> App dir: $APP_DIR"

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

SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
cat > .env <<EOF
SECRET_KEY=${SECRET}
DEBUG=False
ALLOWED_HOSTS=${PUBLIC_HOST},localhost,127.0.0.1
BACKEND_CORS_ORIGINS=http://${PUBLIC_HOST}:${FRONTEND_PORT},http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://${PUBLIC_HOST}:${FRONTEND_PORT},http://${PUBLIC_HOST}:${BACKEND_PORT},http://localhost:3000,http://localhost:8000
APP_URL=http://${PUBLIC_HOST}:${BACKEND_PORT}
FRONTEND_URL=http://${PUBLIC_HOST}:${FRONTEND_PORT}
EOF

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

cat > "$HOME/.config/kedismart/run-backend.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../Kedi_Smart/backend" 2>/dev/null || cd "$HOME/Kedi_Smart/backend"
set -a
source .env
source .venv/bin/activate
set +a
exec gunicorn config.wsgi:application --bind 0.0.0.0:${BACKEND_PORT:-8000} --workers 2
EOF
# Fix path for run script (portable)
cat > "$HOME/.config/kedismart/run-backend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/backend"
set -a
source .env
source .venv/bin/activate
set +a
exec gunicorn config.wsgi:application --bind 0.0.0.0:${BACKEND_PORT} --workers 2
EOF
chmod +x "$HOME/.config/kedismart/run-backend.sh"

# --- Frontend ---
echo "==> Frontend setup"
cd "$APP_DIR/frontend"
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://${PUBLIC_HOST}:${BACKEND_PORT}/api/v1
EOF
npm ci || npm install
npm run build

cat > "$HOME/.config/kedismart/run-frontend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/frontend"
# Bind on all interfaces so LAN clients can reach the site (not only localhost).
exec npx next start -H 0.0.0.0 -p ${FRONTEND_PORT}
EOF
chmod +x "$HOME/.config/kedismart/run-frontend.sh"

# --- Restart processes ---
echo "==> Starting services"
pkill -f "gunicorn config.wsgi" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1

nohup "$HOME/.config/kedismart/run-backend.sh" > "$HOME/.config/kedismart/backend.log" 2>&1 &
nohup "$HOME/.config/kedismart/run-frontend.sh" > "$HOME/.config/kedismart/frontend.log" 2>&1 &

sleep 4
if ss -tln | grep -q ":${FRONTEND_PORT} "; then
  echo "Frontend is listening on 0.0.0.0:${FRONTEND_PORT}"
else
  echo "WARNING: Frontend did not bind to :${FRONTEND_PORT}. Log:"
  tail -n 30 "$HOME/.config/kedismart/frontend.log" || true
fi

echo ""
echo "Deployed from GitHub."
echo "  Frontend: http://${PUBLIC_HOST}:${FRONTEND_PORT}"
echo "  Backend:  http://${PUBLIC_HOST}:${BACKEND_PORT}"
echo "  Admin:    http://${PUBLIC_HOST}:${BACKEND_PORT}/admin/"
echo "  Logs:     ~/.config/kedismart/*.log"
echo ""
echo "Redeploy later:"
echo "  cd $APP_DIR && git pull && bash scripts/deploy-from-github.sh"
