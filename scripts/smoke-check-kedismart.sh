#!/usr/bin/env bash
# Post-deploy smoke check — same critical paths local + VPS must pass.
# Usage:
#   bash scripts/smoke-check-kedismart.sh
# Env:
#   NGINX_PORT=82 BACKEND_PORT=8002 FRONTEND_PORT=3000
#   STRICT=1  — exit 1 if any critical check fails (default for deploy)
set -euo pipefail

NGINX_PORT="${NGINX_PORT:-82}"
BACKEND_PORT="${BACKEND_PORT:-8002}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
STRICT="${STRICT:-1}"
HOST_N="127.0.0.1"
FAILS=0
WARNS=0

ok()   { echo "  OK   $1"; }
warn() { echo "  WARN $1"; WARNS=$((WARNS + 1)); }
fail() { echo "  FAIL $1"; FAILS=$((FAILS + 1)); }

code_of() {
  local url="$1"
  curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000"
}

json_post_code() {
  local url="$1"
  local body="$2"
  curl -sS -o /tmp/kedi_smoke_body.json -w "%{http_code}" --max-time 15 \
    -H "Content-Type: application/json" \
    -X POST -d "$body" "$url" 2>/dev/null || echo "000"
}

expect_code() {
  local label="$1" url="$2" expect="$3"
  local got
  got="$(code_of "$url")"
  if [[ "$got" == "$expect" ]]; then
    ok "$label ($got)"
  else
    fail "$label — expected HTTP $expect, got $got ($url)"
  fi
}

expect_code_any() {
  local label="$1" url="$2"
  shift 2
  local got
  got="$(code_of "$url")"
  for e in "$@"; do
    if [[ "$got" == "$e" ]]; then
      ok "$label ($got)"
      return
    fi
  done
  fail "$label — expected one of [$*], got $got ($url)"
}

echo "=== Kedi Smart smoke check ==="
echo "nginx :$NGINX_PORT | next :$FRONTEND_PORT | django :$BACKEND_PORT"
echo

# --- Listeners ---
echo "Listeners"
if ss -tln 2>/dev/null | grep -q ":${BACKEND_PORT} "; then
  ok "Django listening :$BACKEND_PORT"
else
  fail "Django not listening on :$BACKEND_PORT"
fi
if ss -tln 2>/dev/null | grep -q ":${FRONTEND_PORT} "; then
  ok "Next.js listening :$FRONTEND_PORT"
else
  fail "Next.js not listening on :$FRONTEND_PORT"
fi
if ss -tln 2>/dev/null | grep -q ":${NGINX_PORT} "; then
  ok "nginx listening :$NGINX_PORT"
else
  warn "nginx not on :$NGINX_PORT (LAN/direct ports may still work)"
fi
echo

# --- Direct Django (parity with local :8000 / VPS :8002) ---
echo "Backend (direct)"
expect_code "health" "http://${HOST_N}:${BACKEND_PORT}/health" "200"
expect_code_any "shop products" "http://${HOST_N}:${BACKEND_PORT}/api/v1/shop/products" "200"
expect_code_any "shop categories" "http://${HOST_N}:${BACKEND_PORT}/api/v1/shop/categories" "200"
expect_code_any "payment options" "http://${HOST_N}:${BACKEND_PORT}/api/v1/shop/payment-options" "200"

fp_code="$(json_post_code "http://${HOST_N}:${BACKEND_PORT}/api/v1/auth/forgot-password" '{"email":"smoke-nonexistent@example.com"}')"
if [[ "$fp_code" == "200" ]]; then
  ok "forgot-password API ($fp_code)"
else
  fail "forgot-password API — expected 200, got $fp_code"
fi

login_code="$(json_post_code "http://${HOST_N}:${BACKEND_PORT}/api/v1/auth/login" '{"email":"x","password":"y"}')"
# 401/400 both mean the route is alive
if [[ "$login_code" == "401" || "$login_code" == "400" || "$login_code" == "200" ]]; then
  ok "login API reachable ($login_code)"
else
  fail "login API — unexpected $login_code"
fi

expect_code_any "django-admin login" \
  "http://${HOST_N}:${BACKEND_PORT}/django-admin/login/" "200" "302"
echo

# --- Next.js direct ---
echo "Frontend (direct)"
expect_code_any "home" "http://${HOST_N}:${FRONTEND_PORT}/" "200"
expect_code_any "login page" "http://${HOST_N}:${FRONTEND_PORT}/login" "200"
expect_code_any "forgot-password page" "http://${HOST_N}:${FRONTEND_PORT}/forgot-password" "200"
expect_code_any "shop page" "http://${HOST_N}:${FRONTEND_PORT}/shop" "200"
echo

# --- nginx single-origin (production path) ---
if ss -tln 2>/dev/null | grep -q ":${NGINX_PORT} "; then
  echo "Public door (nginx :$NGINX_PORT)"
  expect_code_any "nginx home" "http://${HOST_N}:${NGINX_PORT}/" "200"
  expect_code "nginx health" "http://${HOST_N}:${NGINX_PORT}/health" "200"
  expect_code_any "nginx API products" "http://${HOST_N}:${NGINX_PORT}/api/v1/shop/products" "200"
  expect_code_any "nginx forgot-password page" \
    "http://${HOST_N}:${NGINX_PORT}/forgot-password" "200"
  nfp="$(json_post_code "http://${HOST_N}:${NGINX_PORT}/api/v1/auth/forgot-password" '{"email":"smoke-nonexistent@example.com"}')"
  if [[ "$nfp" == "200" ]]; then
    ok "nginx forgot-password API ($nfp)"
  else
    fail "nginx forgot-password API — expected 200, got $nfp"
  fi
  expect_code_any "nginx django-admin" \
    "http://${HOST_N}:${NGINX_PORT}/django-admin/login/" "200" "302"
  echo
fi

echo "=== Summary: $FAILS failure(s), $WARNS warning(s) ==="
if [[ "$FAILS" -gt 0 ]]; then
  echo "Check logs: ~/.config/kedismart/backend.log  ~/.config/kedismart/frontend.log"
  if [[ "$STRICT" == "1" ]]; then
    exit 1
  fi
  exit 0
fi
echo "All critical checks passed — site should match localhost behavior via the public origin."
exit 0
