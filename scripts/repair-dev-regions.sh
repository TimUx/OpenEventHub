#!/usr/bin/env bash
# Repair DEV regions to Land → Bundesland → Landkreis → Kommune → Ort.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${OEH_ENV_FILE:-${ROOT_DIR}/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

POSTGRES_USER="${POSTGRES_USER:-openeventhub}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-openeventhub_change_me}"
POSTGRES_DB="${POSTGRES_DB:-openeventhub}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-openeventhub}"
INTERNAL_NETWORK="${COMPOSE_PROJECT_NAME}_internal"

docker compose -f "${ROOT_DIR}/docker/compose/docker-compose.yml" --env-file "${ENV_FILE}" up -d postgres

docker run --rm \
  --network "${INTERNAL_NETWORK}" \
  -v "${ROOT_DIR}:/workspace" \
  -w /workspace \
  -e npm_config_cache=/workspace/.npm-cache \
  -e "DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  node:22-bookworm \
  bash -lc "npm run db:generate && npx tsx packages/database/prisma/repair-dev-regions.ts"

echo "DEV regions repaired."
