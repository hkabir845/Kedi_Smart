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
