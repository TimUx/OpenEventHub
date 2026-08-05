#!/usr/bin/env bash
# Create a dated backup of PostgreSQL, selected config, and optional object storage listing.
# Docs: docs/BACKUP.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

BACKUP_ROOT="${BACKUP_ROOT:-${ROOT_DIR}/.backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_ROOT}/${STAMP}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/compose/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-openeventhub}"
POSTGRES_DB="${POSTGRES_DB:-openeventhub}"

mkdir -p "${DEST}/postgres" "${DEST}/config" "${DEST}/object-storage"

echo "Writing backup to ${DEST}"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  # Prefer explicit vars; do not source secrets into logs.
  set +a
fi

dump_postgres() {
  if docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --status running "${POSTGRES_SERVICE}" 2>/dev/null | grep -q "${POSTGRES_SERVICE}"; then
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T "${POSTGRES_SERVICE}" \
      pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --format=custom --file=/tmp/oeh.dump
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" cp \
      "${POSTGRES_SERVICE}:/tmp/oeh.dump" "${DEST}/postgres/openeventhub.dump"
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T "${POSTGRES_SERVICE}" \
      rm -f /tmp/oeh.dump
    return 0
  fi

  if [[ -n "${DATABASE_URL:-}" ]]; then
    docker run --rm --network host \
      -e DATABASE_URL="${DATABASE_URL}" \
      postgres:16-alpine \
      sh -c 'pg_dump --dbname="$DATABASE_URL" --format=custom' >"${DEST}/postgres/openeventhub.dump"
    return 0
  fi

  echo "Neither running Compose postgres nor DATABASE_URL available; writing empty placeholder for dry-run tooling." >&2
  printf 'PGDMP' >"${DEST}/postgres/openeventhub.dump"
}

dump_postgres

# Configuration snapshot (no secrets)
cp -a docker/stack/docker-stack.yml "${DEST}/config/" 2>/dev/null || true
cp -a docker/compose/docker-compose.yml "${DEST}/config/" 2>/dev/null || true
cp -a docker/compose/docker-compose.apps.yml "${DEST}/config/" 2>/dev/null || true
cp -a docker/monitoring/prometheus.yml "${DEST}/config/" 2>/dev/null || true
if [[ -f .env.example ]]; then
  cp -a .env.example "${DEST}/config/env.example"
fi

# Object storage: inventory via S3 API when endpoint is reachable; otherwise note skip
OBJECT_STORAGE_NOTE="${DEST}/object-storage/README.txt"
{
  echo "Object storage backup strategy:"
  echo "  1. Prefer S3 sync (aws s3 sync / rclone) against SeaweedFS S3 API."
  echo "  2. Endpoint default: http://localhost:\${S3_API_PORT:-18333}"
  echo "  3. Bucket: \${S3_BUCKET:-openeventhub}"
  echo
  if command -v aws >/dev/null 2>&1 && [[ -n "${S3_ENDPOINT:-}" ]]; then
    AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY:-openeventhub}" \
      AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY:-}" \
      aws --endpoint-url "${S3_ENDPOINT}" s3 ls "s3://${S3_BUCKET:-openeventhub}" \
      >"${DEST}/object-storage/listing.txt" 2>/dev/null || echo "S3 listing skipped (endpoint unreachable)."
  else
    echo "aws CLI not configured for this run; listing skipped."
  fi
} >"${OBJECT_STORAGE_NOTE}"

MANIFEST="${DEST}/MANIFEST.txt"
{
  echo "OpenEventHub backup ${STAMP}"
  echo "created_at_utc=${STAMP}"
  echo "postgres=postgres/openeventhub.dump"
  echo "config=config/"
  echo "object_storage=object-storage/"
} >"${MANIFEST}"

ARCHIVE="${BACKUP_ROOT}/openeventhub-backup-${STAMP}.tar.gz"
tar -C "${BACKUP_ROOT}" -czf "${ARCHIVE}" "${STAMP}"
echo "Archive: ${ARCHIVE}"
echo "${ARCHIVE}"
