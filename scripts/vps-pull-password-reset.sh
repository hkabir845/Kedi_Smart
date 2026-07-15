#!/usr/bin/env bash
# Run on VPS (sas-server). Pulls latest forgot-password/deploy hardening and verifies SMTP.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/Kedi_Smart}"
cd "$APP_DIR"

echo "==> Current commit: $(git log -1 --oneline)"
echo "==> Syncing origin/main (stash local VPS edits so pull can proceed)"
git fetch origin
git checkout main

if ! git diff-index --quiet HEAD -- || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  echo "==> Stashing local changes (backend/.env data/ uploads/ stay)"
  git stash push -u -m "vps-password-reset auto-stash $(date -u +%Y-%m-%dT%H:%MZ)" || true
fi

git pull --ff-only origin main
echo "==> Now: $(git log -1 --oneline)"

echo "==> Ensure Django sees new management command"
ls -la backend/accounts/management/commands/check_password_reset.py
ls -la backend/accounts/management/__init__.py backend/accounts/management/commands/__init__.py

cd "$APP_DIR/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt gunicorn

python manage.py migrate --noinput
python manage.py check_password_reset || true

echo "==> Restart gunicorn :8002 (BusinessBooks :8001 untouched)"
pkill -f 'gunicorn config.wsgi:application --bind 127.0.0.1:8002' 2>/dev/null || true
sleep 1
# Prefer Django loading .env itself (bash source breaks on spaces in From:)
if [[ -x "$HOME/.config/kedismart/run-backend.sh" ]]; then
  # Harden runner if it still sources .env
  if grep -q 'source \.env' "$HOME/.config/kedismart/run-backend.sh" 2>/dev/null; then
    cat > "$HOME/.config/kedismart/run-backend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/backend"
source .venv/bin/activate
exec gunicorn config.wsgi:application --bind 127.0.0.1:8002 --workers 2 --timeout 120
EOF
    chmod +x "$HOME/.config/kedismart/run-backend.sh"
  fi
  nohup "$HOME/.config/kedismart/run-backend.sh" >> "$HOME/.config/kedismart/backend.log" 2>&1 &
else
  nohup bash -c "cd \"$APP_DIR/backend\" && source .venv/bin/activate && exec gunicorn config.wsgi:application --bind 127.0.0.1:8002 --workers 2 --timeout 120" \
    >> "$HOME/.config/kedismart/backend.log" 2>&1 &
fi
sleep 3

echo "==> Verify command + SMTP config"
if ! python manage.py check_password_reset --strict; then
  echo ""
  echo "SMTP not ready. Edit ~/Kedi_Smart/backend/.env then re-run:"
  echo "  python manage.py check_password_reset --send-to you@gmail.com"
  echo "Required keys: EMAIL_HOST EMAIL_HOST_USER EMAIL_HOST_PASSWORD DEFAULT_FROM_EMAIL"
  echo "(Quote DEFAULT_FROM_EMAIL if it has spaces, e.g. DEFAULT_FROM_EMAIL=\"Kedi Smart <you@gmail.com>\")"
  exit 1
fi

echo ""
echo "==> Backend / forgot-password API smoke"
curl -sS -o /dev/null -w "health:%{http_code}\n" http://127.0.0.1:8002/health
curl -sS -o /tmp/kedi_fp.json -w "forgot-password:%{http_code}\n" \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-nonexistent@example.com"}' \
  http://127.0.0.1:8002/api/v1/auth/forgot-password
curl -sS -o /dev/null -w "nginx-home:%{http_code}\n" http://127.0.0.1:82/ || true

echo ""
echo "Done. Optional live email test:"
echo "  cd ~/Kedi_Smart/backend && source .venv/bin/activate"
echo "  python manage.py check_password_reset --send-to YOUR@gmail.com"
