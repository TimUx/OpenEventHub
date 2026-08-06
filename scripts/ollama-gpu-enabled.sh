#!/usr/bin/env bash
# Exit 0 when Ollama should reserve an NVIDIA GPU for Docker Compose.
# OLLAMA_GPU: auto (default) | 1/true/on | 0/false/off
set -euo pipefail

mode="$(echo "${OLLAMA_GPU:-auto}" | tr '[:upper:]' '[:lower:]')"
case "${mode}" in
  0 | false | off | no | never)
    exit 1
    ;;
  1 | true | on | yes | always)
    exit 0
    ;;
esac

# Prefer Docker's registered nvidia runtime (nvidia-container-toolkit).
if docker info --format '{{range $k, $_ := .Runtimes}}{{println $k}}{{end}}' 2>/dev/null | grep -qx 'nvidia'; then
  exit 0
fi

# Fallback: toolkit often exposes CDI / device requests without a named runtime entry.
if docker info 2>/dev/null | grep -qiE 'nvidia|nvidia.com/gpu'; then
  exit 0
fi

exit 1
