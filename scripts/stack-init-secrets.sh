#!/usr/bin/env bash
# Create Docker Swarm secrets required by docker/stack/docker-stack.yml.
# Reads values from environment or prompts once; does not echo secrets.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

require_swarm() {
  if ! docker info 2>/dev/null | grep -q 'Swarm: active'; then
    echo "Docker Swarm is not active. Run: docker swarm init" >&2
    exit 1
  fi
}

upsert_secret() {
  local name="$1"
  local value="$2"
  if docker secret inspect "${name}" >/dev/null 2>&1; then
    echo "Secret '${name}' already exists (left unchanged)."
    return 0
  fi
  printf '%s' "${value}" | docker secret create "${name}" -
  echo "Created secret '${name}'."
}

random_secret() {
  openssl rand -base64 32 | tr -d '\n'
}

require_swarm

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(random_secret)}"
REDIS_PASSWORD="${REDIS_PASSWORD:-$(random_secret)}"
S3_SECRET_KEY="${S3_SECRET_KEY:-$(random_secret)}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-$(random_secret)}"
SETTINGS_ENCRYPTION_KEY="${SETTINGS_ENCRYPTION_KEY:-$(random_secret)}"
POSTGRES_USER="${POSTGRES_USER:-openeventhub}"
POSTGRES_DB="${POSTGRES_DB:-openeventhub}"
DATABASE_URL="${DATABASE_URL:-postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}}"

upsert_secret postgres_password "${POSTGRES_PASSWORD}"
upsert_secret redis_password "${REDIS_PASSWORD}"
upsert_secret s3_secret_key "${S3_SECRET_KEY}"
upsert_secret auth_jwt_secret "${AUTH_JWT_SECRET}"
upsert_secret settings_encryption_key "${SETTINGS_ENCRYPTION_KEY}"
upsert_secret database_url "${DATABASE_URL}"

echo
echo "Label a storage node before deploy:"
echo "  docker node update --label-add oeh.storage=true <node-id>"
echo "Deploy:"
echo "  export SERVICE_VERSION=0.17.0 GITHUB_OWNER=timux"
echo "  docker stack deploy -c docker/stack/docker-stack.yml openeventhub"
