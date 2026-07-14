#!/usr/bin/env bash
# Run ON the VPS while PC serves .sync-staging over LAN.
# Usage:
#   bash <(curl -fsSL http://192.168.68.107:8765/../..)  # or paste below
set -euo pipefail

PC_SYNC="${PC_SYNC:-http://192.168.68.107:8765}"
APP_DIR="${APP_DIR:-$HOME/Kedi_Smart}"

echo "==> App: $APP_DIR"
echo "==> Sync source: $PC_SYNC"

cd "$APP_DIR"
git fetch origin
git checkout main
git pull --ff-only origin main

mkdir -p backend/data backend/uploads
echo "==> Downloading local DB + product images from PC..."
curl -fL "$PC_SYNC/kedismart.db" -o backend/data/kedismart.db
curl -fL "$PC_SYNC/products.tgz" -o /tmp/kedismart-products.tgz
tar -xzf /tmp/kedismart-products.tgz -C backend/uploads
rm -f /tmp/kedismart-products.tgz

echo "==> Redeploying (code build + restart)..."
bash scripts/deploy-from-github.sh

echo "==> Done. Check https://kedismart.sascorporationbd.com/shop?catalog=general"
