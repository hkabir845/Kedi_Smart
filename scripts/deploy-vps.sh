#!/usr/bin/env bash
# Safe Kedi Smart VPS redeploy (run after: git pull --ff-only origin main).
#
# Preserves on every run:
#   - backend/.env          (SECRET_KEY, CORS, admin path, …)
#   - backend/data/*.db     (SQLite / live database)
#   - backend/uploads/      (media files)
#   - backend/.venv         (reused; deps refreshed in place)
#
# Restarts ONLY Kedi Smart:
#   - gunicorn on 127.0.0.1:8002
#   - Next.js on 127.0.0.1:3000
# Does NOT touch BusinessBooks / other apps on :8001.
#
# Usage (on VPS):
#   cd ~/Kedi_Smart
#   git pull --ff-only origin main
#   bash scripts/deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export APP_DIR="${APP_DIR:-$ROOT}"
# Caller already pulled; avoid a second pull fighting the working tree.
export KEDI_SKIP_GIT_PULL="${KEDI_SKIP_GIT_PULL:-1}"

exec bash "$ROOT/scripts/deploy-from-github.sh"
