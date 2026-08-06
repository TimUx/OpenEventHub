#!/usr/bin/env bash
# Wrap `docker compose`: optional bundled Ollama profile + NVIDIA GPU overlay.
# Usage: bash scripts/oeh-compose.sh -f … --env-file .env <command> …
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

files=()
envfiles=()
passthrough=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f | --file)
      if [[ $# -lt 2 ]]; then
        echo "oeh-compose: missing value for $1" >&2
        exit 2
      fi
      files+=(-f "$2")
      shift 2
      ;;
    --env-file)
      if [[ $# -lt 2 ]]; then
        echo "oeh-compose: missing value for --env-file" >&2
        exit 2
      fi
      envfiles+=(--env-file "$2")
      shift 2
      ;;
    *)
      passthrough+=("$@")
      break
      ;;
  esac
done

# Load .env for OLLAMA_* (compose --env-file does not export to this shell).
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

profile_args=()
if bash "${ROOT_DIR}/scripts/ollama-deploy-enabled.sh"; then
  profile_args+=(--profile ollama)
  echo "[oeh] Bundled Ollama enabled (OLLAMA_DEPLOY=${OLLAMA_DEPLOY:-1})" >&2
  if bash "${ROOT_DIR}/scripts/ollama-gpu-enabled.sh"; then
    files+=(-f "${ROOT_DIR}/docker/compose/docker-compose.ollama-gpu.yml")
    echo "[oeh] Ollama NVIDIA GPU overlay enabled (OLLAMA_GPU=${OLLAMA_GPU:-auto})" >&2
  else
    echo "[oeh] Ollama CPU mode (no NVIDIA Docker GPU detected; set OLLAMA_GPU=1 to force)" >&2
  fi
else
  echo "[oeh] Bundled Ollama disabled (OLLAMA_DEPLOY=${OLLAMA_DEPLOY:-0}) — use external OLLAMA_BASE_URL" >&2
  if [[ -n "${OLLAMA_EXTERNAL_NETWORK:-}" ]]; then
    files+=(-f "${ROOT_DIR}/docker/compose/docker-compose.ollama-external.yml")
    echo "[oeh] Attaching api/ai-service to external network '${OLLAMA_EXTERNAL_NETWORK}'" >&2
  fi
  # Drop leftover containers from a previous profile-enabled run when bringing the stack up.
  if [[ ${#passthrough[@]} -gt 0 && "${passthrough[0]}" == "up" ]]; then
    docker rm -f oeh-ollama oeh-ollama-pull >/dev/null 2>&1 || true
  fi
fi

exec docker compose "${files[@]}" "${envfiles[@]}" "${profile_args[@]}" "${passthrough[@]}"
