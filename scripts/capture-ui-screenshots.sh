#!/usr/bin/env bash
# Capture Frontend/Admin screenshots into docs/assets/screenshots/
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT_DIR}/docs/assets/screenshots"
mkdir -p "${OUT}"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:8088}"
ADMIN_BASE="${ADMIN_BASE:-http://admin.localhost:8088}"
ADMIN_EMAIL="${ADMIN_BOOTSTRAP_EMAIL:-admin@openeventhub.local}"
ADMIN_PASSWORD="${ADMIN_BOOTSTRAP_PASSWORD:-ChangeMeNow!}"
HTTP_PORT="${TRAEFIK_HTTP_PORT:-8088}"

TOKEN="$(
  curl -sS -X POST \
    -H 'Host: api.localhost' \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
    "http://localhost:${HTTP_PORT}/api/v1/auth/login" \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["accessToken"])' 2>/dev/null \
    || true
)"

if [[ -z "${TOKEN}" ]]; then
  echo "Could not obtain admin token from API login" >&2
  exit 1
fi

docker run --rm --network host \
  -e FRONTEND_BASE="${FRONTEND_BASE}" \
  -e ADMIN_BASE="${ADMIN_BASE}" \
  -e TOKEN="${TOKEN}" \
  -v "${OUT}:/shots" \
  mcr.microsoft.com/playwright:v1.50.0-jammy \
  bash -lc '
set -e
cd /tmp
npm init -y >/dev/null
npm i playwright@1.50.0 --silent
node <<'"'"'EOF'"'"'
const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  const frontend = process.env.FRONTEND_BASE;
  const admin = process.env.ADMIN_BASE;
  const out = "/shots";
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  async function shot(url, file, waitMs = 2000) {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(waitMs);
    await page.screenshot({ path: `${out}/${file}`, fullPage: false });
  }

  await shot(frontend + "/", "frontend-home.png", 2500);
  await shot(frontend + "/events", "frontend-events.png");

  await page.goto(frontend + "/events", { waitUntil: "networkidle", timeout: 90000 });
  const link = page.locator("a[href*=\"/events/\"]").first();
  if (await link.count()) {
    await link.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${out}/frontend-event-detail.png` });

  await shot(frontend + "/calendar", "frontend-calendar.png", 2500);
  await shot(frontend + "/map", "frontend-map.png", 3500);
  await shot(frontend + "/submit", "frontend-submit.png", 1500);
  await shot(frontend + "/search", "frontend-search.png", 1500);

  const loginCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(admin + "/", { waitUntil: "networkidle", timeout: 90000 });
  await loginPage.waitForTimeout(1000);
  await loginPage.screenshot({ path: `${out}/admin-login.png` });
  await loginCtx.close();

  await page.goto(admin + "/", { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate((token) => localStorage.setItem("oeh_admin_token", token), process.env.TOKEN);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/admin-dashboard.png` });

  await shot(admin + "/sources", "admin-sources.png", 2500);
  await shot(admin + "/moderation", "admin-moderation.png", 2000);
  await shot(admin + "/ai-settings", "admin-ai-settings.png", 2000);

  console.log("screenshots:", fs.readdirSync(out).filter((f) => f.endsWith(".png")).sort());
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
EOF
'

echo "Wrote screenshots to ${OUT}"
