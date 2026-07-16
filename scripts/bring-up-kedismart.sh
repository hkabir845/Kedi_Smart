#!/usr/bin/env bash
# Bring Kedi Smart public site back (nginx :82 + Next :3000 + Django :8002).
# Paste on sas-server. Leaves BusinessBooks on :8001 alone.
set -euo pipefail

APP="${APP_DIR:-$HOME/Kedi_Smart}"
CFG="$HOME/.config/kedismart"
mkdir -p "$CFG"

echo "==> Ensure frontend runner"
cat > "$CFG/run-frontend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP/frontend"
if [[ ! -f .env.local ]]; then
  cat > .env.local <<'ENV'
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8002
NEXT_PUBLIC_DJANGO_ADMIN_URL=/django-admin/
ENV
fi
exec env BACKEND_URL=http://127.0.0.1:8002 npx next start -H 127.0.0.1 -p 3000
EOF
chmod +x "$CFG/run-frontend.sh"

echo "==> Ensure backend runner on :8002"
cat > "$CFG/run-backend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP/backend"
source .venv/bin/activate
# Django settings load backend/.env — do not bash-source (breaks on spaces in email From:)
exec gunicorn config.wsgi:application --bind 127.0.0.1:8002 --workers 2 --timeout 120
EOF
chmod +x "$CFG/run-backend.sh"

cd "$APP/frontend"
if [[ ! -d .next ]]; then
  echo "==> No .next build — building frontend (takes a few minutes)"
  npm ci || npm install
  npm run build
fi

echo "==> Restart Next on :3000"
pkill -f "next start -H 127.0.0.1 -p 3000" 2>/dev/null || true
pkill -f "$APP/frontend.*next-server" 2>/dev/null || true
sleep 1
nohup "$CFG/run-frontend.sh" >"$CFG/frontend.log" 2>&1 &

echo "==> Restart Django on :8002 (if needed)"
if ! ss -tln | grep -q ':8002 '; then
  nohup "$CFG/run-backend.sh" >"$CFG/backend.log" 2>&1 &
fi

echo "==> Reload nginx :82"
bash "$APP/scripts/install-nginx-kedismart.sh" || true

sleep 4
echo "==> Listeners"
ss -tlnp | grep -E ':82|:3000|:8002|:8001' || true

echo "==> Local checks"
bash "$APP/scripts/smoke-check-kedismart.sh" || true

echo
echo "If next/nginx_home is not 200: tail -n 60 $CFG/frontend.log"
echo "Public: https://kedismart.com/"
echo "Admin:  https://kedismart.com/django-admin/"
