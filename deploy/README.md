# Single-origin public deploy (matches GAIMS / Business Books pattern)

Kedi Smart is **two processes** (Next.js + Django). GAIMS/Business Books already hide that behind **one nginx port**, so Cloudflare only needs **one** Service URL.

## How the others work

| Public hostname | Cloudflare → local | What sits behind it |
|-----------------|--------------------|---------------------|
| `gaims.sascorporationbd.com` | `http://127.0.0.1:80` | nginx combines UI + API |
| `businessbooks.sascorporationbd.com` | `http://127.0.0.1:81` | nginx combines UI + API |
| `kedismart.sascorporationbd.com` | **`http://127.0.0.1:82`** | nginx → Next `:3000` + Django `:8002` |

## Cloudflare (one row only)

| Destination | Service URL |
|-------------|-------------|
| `kedismart.sascorporationbd.com` | `http://127.0.0.1:82` |

**Remove** any extra `kedismart` / `api.kedismart` rows that point at `:3000` or `:8002`.

On this VPS, **`:8001` is BusinessBooks** — Kedi Django must use **`:8002`**.

## Paths under the one URL

| Path | Backend |
|------|---------|
| `/` (storefront) | Next.js `:3000` |
| `/api/...` | Django `:8002` |
| `/uploads/...`, `/static/...`, `/health` | Django `:8002` |
| `/admin/...` | Next.js app admin UI |
| `/django-admin/...` | Django Unfold admin |

## VPS install

```bash
cd ~/Kedi_Smart
git pull origin main
bash scripts/deploy-from-github.sh
# or only nginx:
sudo apt install -y nginx
bash scripts/install-nginx-kedismart.sh
```

Frontend env must be same-origin:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=/api/v1
BACKEND_URL=http://127.0.0.1:8002
```

## Safe redeploy (won't break live site)

```bash
cd ~/Kedi_Smart
bash scripts/deploy-vps.sh
```

Always preserved: `backend/.env`, `backend/data/`, `backend/uploads/`.  
`SECRET_KEY` is never rotated. Demo seed runs only on an **empty** DB (no users).

After every deploy the script runs `scripts/smoke-check-kedismart.sh` against:

| Check | Why it matches localhost |
|-------|---------------------------|
| Django `/health` + shop API | Same backend routes as local `:8000` |
| `/api/v1/auth/forgot-password` | Auth OTP path |
| Next `/`, `/login`, `/forgot-password`, `/shop` | Same UI routes |
| nginx `:82` → API + pages | Public Cloudflare door |

Re-run anytime:

```bash
bash ~/Kedi_Smart/scripts/smoke-check-kedismart.sh
```

If smoke fails: `tail -n 80 ~/.config/kedismart/backend.log` and `frontend.log`.

To redeploy without failing the script on smoke (not recommended):

```bash
KEDI_SMOKE_STRICT=0 bash scripts/deploy-vps.sh
```

## Forgot password (SMTP) — required on VPS

Without SMTP, OTP codes only appear in gunicorn logs (console backend). Users never get email.

1. Edit `backend/.env` on the VPS (keep existing `FRONTEND_URL=https://your-public-domain`):

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx   # Gmail App Password (2FA on)
DEFAULT_FROM_EMAIL="Kedi Smart <your@gmail.com>"
```

Setting `EMAIL_HOST` alone switches Django to the SMTP backend — you do **not** need `EMAIL_BACKEND=…`.

2. Sync env into the runner and restart gunicorn:

```bash
cd ~/Kedi_Smart/backend
cp .env ~/.config/kedismart/backend.env   # if your run-backend sources this
pkill -f 'gunicorn config.wsgi:application --bind 127.0.0.1:8002' || true
bash ~/.config/kedismart/run-backend.sh >> ~/.config/kedismart/backend.log 2>&1 &
```

3. Verify:

```bash
cd ~/Kedi_Smart/backend
source .venv/bin/activate
python manage.py check_password_reset --strict
python manage.py check_password_reset --send-to you@example.com
```

4. Browser smoke test: open `https://your-domain/forgot-password`, request OTP, enter the 6-digit code from the inbox (and spam folder).

**Checklist**

| Item | Must be |
|------|---------|
| `DEBUG` | `False` |
| `FRONTEND_URL` | `https://public-domain` (not localhost) |
| `APP_URL` | same public origin |
| `EMAIL_HOST` + user + password | real SMTP |
| `DEFAULT_FROM_EMAIL` | allowed by your SMTP provider |
| nginx `/api/` → Django | so `/api/v1/auth/forgot-password` works |
