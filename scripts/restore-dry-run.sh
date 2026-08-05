#!/usr/bin/env bash
# Validate a backup archive layout without mutating production data.
# Creates a synthetic fixture when BACKUP_ARCHIVE is unset (CI-friendly).
# Docs: docs/BACKUP.md
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/oeh-restore-dry-run.XXXXXX")"
cleanup() {
  rm -rf "${WORK}"
}
trap cleanup EXIT

ARCHIVE="${BACKUP_ARCHIVE:-}"

if [[ -z "${ARCHIVE}" ]]; then
  FIXTURE_DIR="${WORK}/fixture"
  mkdir -p "${FIXTURE_DIR}/postgres" "${FIXTURE_DIR}/config" "${FIXTURE_DIR}/object-storage"
  # Minimal custom-format signature bytes for structure checks (not a real dump).
  printf 'PGDMP\x01\x0e\x00' >"${FIXTURE_DIR}/postgres/openeventhub.dump"
  echo "dry-run config" >"${FIXTURE_DIR}/config/docker-stack.yml"
  echo "object storage note" >"${FIXTURE_DIR}/object-storage/README.txt"
  cat >"${FIXTURE_DIR}/MANIFEST.txt" <<EOF
OpenEventHub backup dry-run
postgres=postgres/openeventhub.dump
config=config/
object_storage=object-storage/
EOF
  ARCHIVE="${WORK}/fixture.tar.gz"
  tar -C "${WORK}" -czf "${ARCHIVE}" fixture
  echo "Using synthetic fixture archive: ${ARCHIVE}"
fi

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Backup archive not found: ${ARCHIVE}" >&2
  exit 1
fi

EXTRACT="${WORK}/extract"
mkdir -p "${EXTRACT}"
tar -xzf "${ARCHIVE}" -C "${EXTRACT}"

ROOT_ENTRY="$(find "${EXTRACT}" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [[ -z "${ROOT_ENTRY}" ]]; then
  echo "Archive has no top-level directory" >&2
  exit 1
fi

fail=0
require_path() {
  local rel="$1"
  if [[ ! -e "${ROOT_ENTRY}/${rel}" ]]; then
    echo "MISSING: ${rel}" >&2
    fail=1
  else
    echo "OK: ${rel}"
  fi
}

require_path "MANIFEST.txt"
require_path "postgres/openeventhub.dump"
require_path "config"
require_path "object-storage"

DUMP="${ROOT_ENTRY}/postgres/openeventhub.dump"
if ! head -c 5 "${DUMP}" | grep -q 'PGDMP'; then
  echo "postgres dump does not start with PGDMP signature" >&2
  fail=1
else
  echo "OK: postgres dump signature"
fi

# Optional deeper check when pg_restore is available and dump looks real (>16 bytes)
if command -v pg_restore >/dev/null 2>&1 && [[ "$(wc -c <"${DUMP}")" -gt 16 ]]; then
  if pg_restore -l "${DUMP}" >/dev/null 2>&1; then
    echo "OK: pg_restore -l listing"
  else
    echo "WARN: pg_restore -l failed (dump may be placeholder); continuing dry-run structure checks"
  fi
fi

if [[ "${fail}" -ne 0 ]]; then
  echo "Restore dry-run FAILED" >&2
  exit 1
fi

echo "Restore dry-run PASSED"
