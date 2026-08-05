#!/bin/sh
# Load Docker Swarm / Compose secrets from /run/secrets into process env.
# Mapping: secret file name (snake) → ENV var (UPPER_SNAKE).
set -eu

load_secret() {
  name="$1"
  env_name="$2"
  path="/run/secrets/${name}"
  if [ -f "${path}" ]; then
    # shellcheck disable=SC2039
    export "${env_name}=$(cat "${path}")"
  fi
}

load_secret postgres_password POSTGRES_PASSWORD
load_secret redis_password REDIS_PASSWORD
load_secret s3_secret_key S3_SECRET_KEY
load_secret auth_jwt_secret AUTH_JWT_SECRET
load_secret settings_encryption_key SETTINGS_ENCRYPTION_KEY
load_secret database_url DATABASE_URL

exec "$@"
