#!/usr/bin/env bash
# Install / refresh Kedi Smart single-origin nginx (port 82), like GAIMS on :80.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="$ROOT/deploy/nginx-kedismart.conf"
CONF_DST="/etc/nginx/sites-available/kedismart"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }
need nginx
need sudo

echo "==> Installing nginx site (listen 127.0.0.1:82)"
sudo cp "$CONF_SRC" "$CONF_DST"
sudo ln -sf "$CONF_DST" /etc/nginx/sites-enabled/kedismart
sudo nginx -t
sudo systemctl reload nginx

echo "==> Checking listeners"
ss -tlnp | grep -E ':82|:3000|:8001' || true

echo ""
echo "Cloudflare Tunnel — ONE public hostname only:"
echo "  kedismart.sascorporationbd.com  →  http://127.0.0.1:82"
echo ""
echo "Remove any second kedismart / api.kedismart rows pointing at :3000 or :8001."
echo "Django Unfold admin (optional): https://kedismart.sascorporationbd.com/django-admin/"
echo "Next vendor/admin UI stays at:     https://kedismart.sascorporationbd.com/admin/"
