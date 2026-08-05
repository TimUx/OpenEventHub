#!/usr/bin/env bash
# HTTP smoke checks against a running stack (Compose or Swarm published ports).
# Not a full browser E2E suite — verifies probes and public API reachability.
set -euo pipefail

API_BASE="${API_BASE:-http://api.localhost}"
FRONTEND_BASE="${FRONTEND_BASE:-http://localhost}"
ADMIN_BASE="${ADMIN_BASE:-http://admin.localhost}"
TIMEOUT_SEC="${TIMEOUT_SEC:-5}"

check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time "${TIMEOUT_SEC}" "${url}" || true)"
  if [[ "${code}" != "${expect}" ]]; then
    echo "FAIL ${name}: ${url} -> HTTP ${code} (expected ${expect})" >&2
    return 1
  fi
  echo "OK   ${name}: ${url} -> ${code}"
}

fail=0
check "api health" "${API_BASE}/health" || fail=1
check "api ready" "${API_BASE}/ready" || fail=1
check "api metrics" "${API_BASE}/metrics" || fail=1
check "api events" "${API_BASE}/api/v1/events?limit=1" || fail=1
check "frontend" "${FRONTEND_BASE}/" || fail=1
check "admin" "${ADMIN_BASE}/" || fail=1

if [[ "${fail}" -ne 0 ]]; then
  echo "E2E smoke FAILED (is the stack up? set API_BASE/FRONTEND_BASE/ADMIN_BASE)" >&2
  exit 1
fi
echo "E2E smoke PASSED"
