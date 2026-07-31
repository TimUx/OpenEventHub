#!/usr/bin/env bash
# Bootstrap local environment and start infrastructure.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — review secrets before production use."
fi

docker compose -f docker/compose/docker-compose.yml --env-file .env up -d
bash scripts/check-infra-health.sh
