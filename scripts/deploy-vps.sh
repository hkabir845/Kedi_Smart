#!/usr/bin/env bash
# Safe Kedi Smart VPS redeploy.
#
# Preserves on every run:
#   - backend/.env          (SECRET_KEY, CORS, SMTP, admin path, …)
#   - backend/data/*.db     (SQLite / live database)
#   - backend/uploads/      (media files)
#   - backend/.venv         (reused; deps refreshed in place)
#
# Restarts ONLY Kedi Smart:
#   - gunicorn on 127.0.0.1:8002
#   - Next.js on 127.0.0.1:3000
# Does NOT touch BusinessBooks / other apps on :8001.
#
# Ends with scripts/smoke-check-kedismart.sh (home, shop, auth, forgot-password).
# Opt out of hard-fail: KEDI_SMOKE_STRICT=0 bash scripts/deploy-vps.sh
#
# Usage (on VPS):
#   cd ~/Kedi_Smart
#   bash scripts/deploy-vps.sh
#
# Env:
#   KEDI_SKIP_GIT_PULL=1   — skip fetch/pull (already synced)
#   KEDI_NO_STASH=1        — fail instead of stashing dirty files before pull
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/scripts/deploy-from-github.sh" ]]; then
  echo "ERROR: scripts/deploy-from-github.sh missing."
  echo "Fix with: git fetch origin && git checkout origin/main -- scripts/deploy-from-github.sh scripts/deploy-vps.sh"
  exit 1
fi

if [[ "${KEDI_SKIP_GIT_PULL:-0}" != "1" ]]; then
  echo "==> Syncing origin/main"
  git fetch origin

  if ! git diff-index --quiet HEAD -- || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
    if [[ "${KEDI_NO_STASH:-0}" == "1" ]]; then
      echo "ERROR: Working tree is dirty. Commit/stash on the VPS, or omit KEDI_NO_STASH."
      git status -sb
      exit 1
    fi
    echo "==> Stashing local VPS changes (including untracked) so pull can succeed"
    echo "    (backend/.env, backend/data/, uploads/ are NOT touched by stash)"
    git stash push -u -m "deploy-vps auto-stash $(date -u +%Y-%m-%dT%H:%MZ)" || true
  fi

  git checkout main
  if ! git pull --ff-only origin main; then
    echo "ERROR: git pull --ff-only failed. Resolve manually, then re-run."
    exit 1
  fi
fi

export APP_DIR="${APP_DIR:-$ROOT}"
# Inner script should not pull again.
export KEDI_SKIP_GIT_PULL=1

exec bash "$ROOT/scripts/deploy-from-github.sh"
