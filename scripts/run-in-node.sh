#!/usr/bin/env bash
# Run a command inside the Node 22 tooling container (no host Node dependency).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE="${OEH_NODE_IMAGE:-node:22-bookworm}"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command...>" >&2
  exit 1
fi

docker run --rm \
  -v "${ROOT_DIR}:/workspace" \
  -w /workspace \
  -e npm_config_cache=/workspace/.npm-cache \
  "${IMAGE}" \
  bash -lc "$*"
