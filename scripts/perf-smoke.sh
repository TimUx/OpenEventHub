#!/usr/bin/env bash
# Lightweight performance smoke: latency + throughput against public API.
# Requires a running API. Not a load-test benchmark suite.
set -euo pipefail

API_BASE="${API_BASE:-http://api.localhost}"
PATH_UNDER_TEST="${PATH_UNDER_TEST:-/api/v1/events?limit=10}"
REQUESTS="${REQUESTS:-30}"
CONCURRENCY="${CONCURRENCY:-5}"
MAX_P95_MS="${MAX_P95_MS:-2000}"

URL="${API_BASE}${PATH_UNDER_TEST}"
TMP="$(mktemp)"
cleanup() { rm -f "${TMP}"; }
trap cleanup EXIT

echo "Perf smoke: ${REQUESTS} requests, concurrency ${CONCURRENCY}, url=${URL}"

run_one() {
  curl -sS -o /dev/null -w '%{time_total}\n' --max-time 10 "${URL}" || echo '10.000'
}

export -f run_one
export URL

seq 1 "${REQUESTS}" | xargs -P "${CONCURRENCY}" -I{} bash -c 'run_one' >"${TMP}"

python3 - "${TMP}" "${MAX_P95_MS}" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
max_p95_ms = float(sys.argv[2])
values = sorted(float(line) * 1000 for line in path.read_text().splitlines() if line.strip())
if not values:
    print("No samples collected", file=sys.stderr)
    sys.exit(1)

def pct(p: float) -> float:
    idx = min(len(values) - 1, max(0, int(round((p / 100) * (len(values) - 1)))))
    return values[idx]

avg = sum(values) / len(values)
p50 = pct(50)
p95 = pct(95)
print(f"samples={len(values)} avg_ms={avg:.1f} p50_ms={p50:.1f} p95_ms={p95:.1f} max_ms={values[-1]:.1f}")
if p95 > max_p95_ms:
    print(f"FAIL: p95 {p95:.1f}ms exceeds budget {max_p95_ms:.0f}ms", file=sys.stderr)
    sys.exit(1)
print("Perf smoke PASSED")
PY
