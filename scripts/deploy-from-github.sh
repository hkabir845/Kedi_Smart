#!/usr/bin/env bash
# Deploy Kedi Smart from GitHub onto a VPS (Django + Next.js + SQLite).
# Usage (on the VPS):
#   curl -fsSL https://raw.githubusercontent.com/hkabir845/Kedi_Smart/main/scripts/deploy-from-github.sh | bash
# or after clone:
#   bash scripts/deploy-from-github.sh
#
# Safe guarantees:
#   - Never deletes backend/.env, data/, or uploads/
#   - Never rotates SECRET_KEY on redeploy
#   - Never touches BusinessBooks (:8001)
#   - Merges required production URL keys without wiping EMAIL_* / SMTP
#   - Does not `source .env` in bash (spaces in DEFAULT_FROM_EMAIL break that)
#   - Ends with smoke checks (same paths as localhost)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hkabir845/Kedi_Smart.git}"
APP_DIR="${APP_DIR:-$HOME/Kedi_Smart}"
PUBLIC_HOST="${PUBLIC_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
PUBLIC_HOST="${PUBLIC_HOST:-192.168.68.105}"
# 8001 is taken by BusinessBooks (fsms) on sas-server — keep Kedi on 8002
BACKEND_PORT="${BACKEND_PORT:-8002}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
NGINX_PORT="${NGINX_PORT:-82}"
PUBLIC_DOMAIN="${PUBLIC_DOMAIN:-kedismart.com}"

echo "==> Host: $PUBLIC_HOST"
echo "==> App dir: $APP_DIR"
echo "==> Single public origin via nginx :${NGINX_PORT} (like GAIMS :80)"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }; }

need git
need python3
need npm
need curl

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "==> Cloning $REPO_URL"
  git clone "$REPO_URL" "$APP_DIR"
elif [[ "${KEDI_SKIP_GIT_PULL:-0}" == "1" ]]; then
  echo "==> Skipping git pull (KEDI_SKIP_GIT_PULL=1 — already synced)"
else
  echo "==> Pulling latest from origin/main"
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout main
  git -C "$APP_DIR" pull --ff-only origin main
fi

cd "$APP_DIR"

# Guardrails: never wipe live data / secrets during redeploy.
mkdir -p "$APP_DIR/backend/data" "$APP_DIR/backend/uploads"
echo "==> Preserving backend/.env, backend/data/, backend/uploads/ (no wipe)"

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
# Forgot-password OTP — REQUIRED for production (edit then restart gunicorn):
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=true
# EMAIL_HOST_USER=
# EMAIL_HOST_PASSWORD=
# DEFAULT_FROM_EMAIL="Kedi Smart <noreply@${PUBLIC_DOMAIN}>"
EOF
  echo "==> Wrote new backend/.env (add EMAIL_* for forgot-password)"
else
  echo "==> Keeping existing backend/.env (normalizing URL keys only)"
  cp -a .env ".env.bak.$(date +%Y%m%d%H%M%S)" || true
fi

# Normalize production URL keys WITHOUT wiping SECRET_KEY / EMAIL_* / SMTP.
# Also ensure public domain is listed in ALLOWED_HOSTS + CORS + CSRF.
PUBLIC_DOMAIN="$PUBLIC_DOMAIN" PUBLIC_HOST="$PUBLIC_HOST" \
FRONTEND_PORT="$FRONTEND_PORT" NGINX_PORT="$NGINX_PORT" BACKEND_PORT="$BACKEND_PORT" \
python3 - <<'PY'
from pathlib import Path
from urllib.parse import urlparse
import os

p = Path(".env")
text = p.read_text(encoding="utf-8") if p.exists() else ""
lines = text.splitlines()
kv = {}
order = []
for line in lines:
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, v = s.split("=", 1)
    k = k.strip()
    v = v.strip().strip('"').strip("'")
    if k not in kv:
        order.append(k)
    kv[k] = v

domain = os.environ.get("PUBLIC_DOMAIN", "kedismart.com")
host = os.environ.get("PUBLIC_HOST", "127.0.0.1")
fe_port = os.environ.get("FRONTEND_PORT", "3000")
nx_port = os.environ.get("NGINX_PORT", "82")
be_port = os.environ.get("BACKEND_PORT", "8002")
public_https = f"https://{domain}"

# Origins must be scheme+host only (no /django-admin path).
for key in ("APP_URL", "FRONTEND_URL"):
    val = kv.get(key, "") or public_https
    if "://" in val:
        u = urlparse(val)
        kv[key] = f"{u.scheme}://{u.netloc}"
    else:
        kv[key] = public_https

kv["DJANGO_ADMIN_URL_PREFIX"] = "django-admin"
kv["DJANGO_ADMIN_PUBLIC_PATH"] = "/django-admin/"
kv.setdefault("DEBUG", "False")

def merge_csv(key: str, required: list[str]) -> None:
    existing = [x.strip() for x in (kv.get(key) or "").split(",") if x.strip()]
    seen = set(existing)
    for item in required:
        if item and item not in seen:
            existing.append(item)
            seen.add(item)
    kv[key] = ",".join(existing)

merge_csv(
    "ALLOWED_HOSTS",
    [domain, host, "localhost", "127.0.0.1"],
)
merge_csv(
    "BACKEND_CORS_ORIGINS",
    [
        public_https,
        f"http://{host}:{fe_port}",
        f"http://{host}:{nx_port}",
        kv["FRONTEND_URL"],
    ],
)
merge_csv(
    "CSRF_TRUSTED_ORIGINS",
    [
        public_https,
        f"http://{host}:{fe_port}",
        f"http://{host}:{nx_port}",
        f"http://{host}:{be_port}",
        kv["APP_URL"],
        kv["FRONTEND_URL"],
    ],
)

# Rewrite known keys in place; append any missing. Never drop EMAIL_* lines.
managed = (
    "APP_URL",
    "FRONTEND_URL",
    "DJANGO_ADMIN_URL_PREFIX",
    "DJANGO_ADMIN_PUBLIC_PATH",
    "ALLOWED_HOSTS",
    "BACKEND_CORS_ORIGINS",
    "CSRF_TRUSTED_ORIGINS",
    "DEBUG",
)
seen = set()
out = []
for line in lines:
    s = line.strip()
    if s and not s.startswith("#") and "=" in s:
        k = s.split("=", 1)[0].strip()
        if k in managed:
            out.append(f"{k}={kv[k]}")
            seen.add(k)
            continue
    out.append(line)
for k in managed:
    if k not in seen:
        out.append(f"{k}={kv[k]}")
p.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
print("normalized:", {k: kv[k] for k in managed})
PY

# Do NOT bash-source .env — values like DEFAULT_FROM_EMAIL="Name <a@b>" break `set -a; source`.
# Django settings.py loads backend/.env itself via setdefault.

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Seed only if no users yet (best-effort) — never reseeds a live DB with users.
if ! python manage.py shell -c "from accounts.models import User; raise SystemExit(0 if User.objects.exists() else 1)"; then
  echo "==> Seeding demo data (empty database only)"
  python ../scripts/seed_demo.py || true
fi

mkdir -p "$HOME/.config/kedismart"
cp -a .env "$HOME/.config/kedismart/backend.env"

# --- Frontend ---
echo "==> Frontend setup"
cd "$APP_DIR/frontend"
# Production same-origin values (baked into Next at build time).
# Always rewrite these three so localhost URLs never ship to the VPS build.
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_URL=http://127.0.0.1:${BACKEND_PORT}
NEXT_PUBLIC_DJANGO_ADMIN_URL=/django-admin/
NEXT_PUBLIC_APP_URL=https://${PUBLIC_DOMAIN}
EOF
npm ci || npm install
npm run build

# Runners: Django loads .env itself — do not `source .env` here.
cat > "$HOME/.config/kedismart/run-frontend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/frontend"
# Bind localhost only — nginx (:${NGINX_PORT}) is the public door (Cloudflare → nginx).
exec env BACKEND_URL=http://127.0.0.1:${BACKEND_PORT} npx next start -H 127.0.0.1 -p ${FRONTEND_PORT}
EOF
chmod +x "$HOME/.config/kedismart/run-frontend.sh"

cat > "$HOME/.config/kedismart/run-backend.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
cd "$APP_DIR/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
# Settings load backend/.env — avoid bash \`source .env\` (breaks on spaces / <> in email).
exec gunicorn config.wsgi:application --bind 127.0.0.1:${BACKEND_PORT} --workers 2 --timeout 120
EOF
chmod +x "$HOME/.config/kedismart/run-backend.sh"

# --- Restart processes (Kedi only — leave BusinessBooks :8001 alone) ---
echo "==> Restarting Kedi services only (:${BACKEND_PORT} / :${FRONTEND_PORT})"
pkill -f "gunicorn config.wsgi:application --bind 127.0.0.1:${BACKEND_PORT}" 2>/dev/null || true
pkill -f "${APP_DIR}/backend/.venv/bin/gunicorn" 2>/dev/null || true
pkill -f "${HOME}/.config/kedismart/run-backend.sh" 2>/dev/null || true
# Frontend launcher — kill ANY process on Kedi frontend port (order of -H/-p varies).
# Do not use a narrow pkill pattern; a stale `next start -p 3000 -H 0.0.0.0` can keep
# nginx serving an old build (e.g. link-based forgot-password instead of OTP).
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
fi
pkill -f "next start -H 127.0.0.1 -p ${FRONTEND_PORT}" 2>/dev/null || true
pkill -f "next start -p ${FRONTEND_PORT}" 2>/dev/null || true
pkill -f "${HOME}/.config/kedismart/run-frontend.sh" 2>/dev/null || true
pkill -f "${APP_DIR}/frontend.*next start" 2>/dev/null || true
sleep 2

nohup "$HOME/.config/kedismart/run-backend.sh" > "$HOME/.config/kedismart/backend.log" 2>&1 &
nohup "$HOME/.config/kedismart/run-frontend.sh" > "$HOME/.config/kedismart/frontend.log" 2>&1 &

wait_port() {
  local port="$1" name="$2" tries="${3:-30}"
  local i
  for ((i = 1; i <= tries; i++)); do
    if ss -tln 2>/dev/null | grep -q ":${port} "; then
      echo "  $name is listening on :${port}"
      return 0
    fi
    sleep 1
  done
  echo "WARNING: $name did not bind to :${port} within ${tries}s"
  return 1
}

echo "==> Waiting for services"
wait_port "$BACKEND_PORT" "Django" 40 || true
wait_port "$FRONTEND_PORT" "Next.js" 60 || {
  echo "Frontend log (last 40 lines):"
  tail -n 40 "$HOME/.config/kedismart/frontend.log" || true
}

# nginx single-origin door
if command -v nginx >/dev/null 2>&1; then
  echo "==> Installing/reloading nginx site on :${NGINX_PORT}"
  bash "$APP_DIR/scripts/install-nginx-kedismart.sh" || true
else
  echo "WARNING: nginx not installed. Install with: sudo apt install -y nginx"
  echo "Then: bash $APP_DIR/scripts/install-nginx-kedismart.sh"
fi

echo ""
echo "==> Password-reset / SMTP check"
cd "$APP_DIR/backend"
# shellcheck disable=SC1091
source .venv/bin/activate
python manage.py check_password_reset || true
if ! grep -qE '^EMAIL_HOST=.+' .env 2>/dev/null; then
  echo ""
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo " Forgot-password will NOT email OTPs until you set SMTP in"
  echo "   $APP_DIR/backend/.env"
  echo " Then: python manage.py check_password_reset --send-to you@email.com"
  echo " Restart: pkill -f 'gunicorn config.wsgi' ; nohup ~/.config/kedismart/run-backend.sh >> ~/.config/kedismart/backend.log 2>&1 &"
  echo " See deploy/README.md → Forgot password (SMTP)"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
fi

echo ""
echo "==> Smoke check (localhost parity via nginx)"
export NGINX_PORT BACKEND_PORT FRONTEND_PORT
export STRICT="${KEDI_SMOKE_STRICT:-1}"
if ! bash "$APP_DIR/scripts/smoke-check-kedismart.sh"; then
  echo ""
  echo "ERROR: Smoke check failed after deploy."
  echo "  Backend log:  tail -n 80 ~/.config/kedismart/backend.log"
  echo "  Frontend log: tail -n 80 ~/.config/kedismart/frontend.log"
  echo "Fix issues, then: bash $APP_DIR/scripts/smoke-check-kedismart.sh"
  # Do not hard-exit the whole deploy if user opts out
  if [[ "${KEDI_SMOKE_STRICT:-1}" == "1" ]]; then
    exit 1
  fi
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
echo "  cd $APP_DIR && bash scripts/deploy-vps.sh"
echo "Re-check only:"
echo "  bash $APP_DIR/scripts/smoke-check-kedismart.sh"
