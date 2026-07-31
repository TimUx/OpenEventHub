#!/usr/bin/env bash
# Wait until application services report healthy.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILES=(-f "${ROOT_DIR}/docker/compose/docker-compose.yml" -f "${ROOT_DIR}/docker/compose/docker-compose.apps.yml")
ENV_FILE="${ROOT_DIR}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env — copy .env.example to .env first." >&2
  exit 1
fi

SERVICES=(api scheduler worker crawler ai-service ocr-service search frontend admin)
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-300}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-5}"
DEADLINE=$((SECONDS + TIMEOUT_SECONDS))

echo "Checking OpenEventHub application health (timeout=${TIMEOUT_SECONDS}s)..."

while (( SECONDS < DEADLINE )); do
  all_healthy=true
  for service in "${SERVICES[@]}"; do
    status="$(
      docker compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" ps --format json "${service}" \
        | python3 -c 'import json,sys; data=sys.stdin.read().strip();
print("missing" if not data else json.loads(data if data.startswith("{") else data.splitlines()[0]).get("Health","unknown"))' \
        2>/dev/null || echo "missing"
    )"
    if [[ "${status}" != "healthy" ]]; then
      all_healthy=false
      echo "  - ${service}: ${status}"
    else
      echo "  - ${service}: healthy"
    fi
  done

  if [[ "${all_healthy}" == "true" ]]; then
    echo "All application services are healthy."
    exit 0
  fi

  sleep "${INTERVAL_SECONDS}"
done

echo "Application health check timed out." >&2
docker compose "${COMPOSE_FILES[@]}" --env-file "${ENV_FILE}" ps >&2 || true
exit 1
