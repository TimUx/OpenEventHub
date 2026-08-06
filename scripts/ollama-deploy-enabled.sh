#!/usr/bin/env bash
# Exit 0 when the Compose/Stack should deploy the bundled Ollama service.
# OLLAMA_DEPLOY: 1/true/on/bundled (default) | 0/false/off/external
set -euo pipefail

mode="$(echo "${OLLAMA_DEPLOY:-1}" | tr '[:upper:]' '[:lower:]')"
case "${mode}" in
  0 | false | off | no | never | external)
    exit 1
    ;;
  1 | true | on | yes | always | bundled | internal)
    exit 0
    ;;
  *)
    # Unknown values default to deploying bundled Ollama.
    exit 0
    ;;
esac
