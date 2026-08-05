# Developer Guide

> Sprache: Deutsch (primär) · [English](en/DEVELOPER_GUIDE.md)

Leitfaden für Mitwirkende an der laufenden OpenEventHub-Plattform (Compose + Stack).
Dokumentation unter `docs/` ist verbindlich — weichen Code und Docs voneinander ab, ändere den Code.

## Prinzipien

- Clean Architecture / DDD / Hexagonal / SOLID
- API First · Plugin First · AI First · Container First
- Genau ein Milestone gleichzeitig (`docs/ROADMAP.md`)
- Keine Host-Runtime-Abhängigkeit für den **Betrieb** der Plattform (nur Docker)
- Host-Node 20+ ist optional für Contributor-Tooling; bevorzugt `npm run tools:*`

## Repository-Layout

```
architecture/   ADRs + Milestone-Reviews
docker/         Compose, Stack, Traefik-/Postgres-Assets
docs/           Verbindliche Dokumentation
packages/       Gemeinsame Bibliotheken (npm Workspaces)
services/       Ein Verzeichnis pro deploybarem Container
plugins/        Quellen-Connectoren (SDK-basiert)
prompts/        Zentrale LLM-Prompts (einziger Ort für Prompts)
scripts/        Bootstrap- und Ops-Helfer
```

### Packages

| Package | Rolle |
|---------|-------|
| `@openeventhub/shared` | Service-Namen, Queue-Namen, Health-Helfer, Crawl-/AI-Job-Contracts |
| `@openeventhub/database` | Prisma-Schema, Client, Repositories |
| `@openeventhub/plugin-sdk` | Crawl-Plugin TypeScript-Contracts |
| `@openeventhub/ai-core` | LLM-Provider-Adapter + Key-Verschlüsselung |
| `@openeventhub/service-runtime` | NestJS Health-/Ready-/Metrics-Shell |

### Services

| Service | Port (Container) | Rolle |
|---------|------------------|-------|
| `api` | 3000 | REST `/api/v1`, GraphQL, OpenAPI, Admin-APIs |
| `frontend` | 3100 | Öffentliches Portal |
| `admin` | 3101 | Operator-Center |
| `scheduler` | — | Registriert wiederholbare Crawl-Jobs aus `Source.scheduleCron` |
| `crawler` | — | Plugin-Crawl-Pipeline + Objektspeicher |
| `ocr-service` | — | Tesseract-OCR-Queue-Consumer |
| `ai-service` | — | Event Intelligence Engine |
| `search` | — | Suchindex-Worker (Shell) |
| `worker` | — | Generische Worker-Shell |

Kommunikation: HTTP-APIs und Redis/BullMQ-Queues (`docs/COMMUNICATION.md`, `docs/QUEUE_AND_WORKERS.md`).

## Lokaler Stack (Tag eins)

Voraussetzungen: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
# Secrets in .env bearbeiten (niemals echte Secrets committen)

npm run infra:bootstrap   # Traefik, Postgres, Redis, SeaweedFS
bash scripts/db-migrate.sh  # Container am internal-Netz (bevorzugt)
# npm run db:migrate      # Host-Node nur mit docker-compose.dev-ports.yml

npm run db:seed           # oder: bash scripts/db-seed.sh
npm run apps:up           # alle App-Container bauen + starten
npm run apps:health       # warten bis healthy
```

Shortcut, sobald `.env` existiert:

```bash
npm run stack:up          # apps:up + apps:health
```

### Nützliche URLs (Defaults aus `.env.example`)

| Einstieg | URL |
|----------|-----|
| Frontend | http://localhost:8088 |
| API | http://api.localhost:8088 |
| OpenAPI | http://api.localhost:8088/api/docs |
| GraphQL | http://api.localhost:8088/graphql |
| Admin | http://admin.localhost:8088 |
| Traefik-Dashboard | http://traefik.localhost:8088 |

Bootstrap-Admin (aus `.env`): `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`.

AI-Provider-Keys werden **nicht** per Env gesetzt — nach Login unter Admin → AI Settings konfigurieren.

### Ops-Helfer

```bash
npm run infra:ps
npm run infra:logs
npm run infra:down
npm run validate:compose
npm run validate:stack
```

Script-Details: `scripts/bootstrap-infra.sh`, `check-infra-health.sh`, `check-apps-health.sh`,
`db-migrate.sh`, `db-seed.sh`, `run-in-node.sh`, `verify-plugins.sh`.

## Contributor-Tooling

Bevorzugt containerisiertes Node 22 (keine Host-Abhängigkeit):

```bash
npm run tools:check       # CI-ähnlich: Format, Lint, Typecheck, Test
npm run tools:lint
npm run tools:test
npm run verify:plugins    # plugin.json + createPlugin Smoke-Check
```

Mit lokalem Node ≥ 20.11:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run verify:plugins
npm run validate:compose
```

## Umgebung

`.env.example` → `.env` kopieren. Contributors brauchen üblicherweise:

- `POSTGRES_*`, `DATABASE_URL`
- `REDIS_PASSWORD`
- `S3_*` / SeaweedFS-Ports
- `SETTINGS_ENCRYPTION_KEY`, `AUTH_JWT_SECRET`
- `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`
- `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL`
- Traefik-Ports (`TRAEFIK_HTTP_PORT`, …)

Optional: `PLUGINS_DIR` (Compose-Crawler defaultet auf `/app/plugins` im Image).

## An Plugins arbeiten

Neue Quellen = nur Plugins. Crawler-Core für einen neuen Quellentyp nicht ändern.

1. `docs/PLUGIN_SDK.md` und `docs/PLUGIN_DEVELOPMENT.md` lesen
2. Ausgearbeitetes Beispiel in `docs/PLUGIN_EXAMPLE.md` (`plugins/html`) folgen
3. `plugins/<name>/plugin.json` + `index.js` anlegen
4. Crawler neu bauen (`npm run apps:up`), damit das Image Plugins übernimmt
5. Source im Admin mit passendem `pluginType` anlegen
6. `npm run verify:plugins` ausführen

## An API / Admin / Frontend arbeiten

- Öffentliche API: `docs/API.md`, `docs/REST_ENDPOINTS.md`
- Admin Center: `docs/ADMIN_CENTER.md` (UI unter `admin.localhost`)
- Frontend: `docs/FRONTEND.md`, `docs/SEO.md`
- Contract-/Unit-Tests liegen neben den Services (`*.test.ts`); Ausführung über Workspace oder `tools:test`

## Milestone- & Git-Disziplin

1. **Genau einen** Milestone aus `docs/ROADMAP.md` umsetzen
2. Exit-Kriterien: Code + Tests + Docs + Architecture-Review-Note
3. Conventional Commits; SemVer-Release-Notes in `CHANGELOG.md` (siehe `docs/RELEASE.md`)
4. Kleine Commits bevorzugen; keine Architektur erfinden, die ADRs widerspricht

## Weiterlesen

| Thema | Doc |
|-------|-----|
| Architektur | `docs/ARCHITECTURE.md` |
| Datenmodell | `docs/DATA_MODEL.md`, `docs/DATABASE_SCHEMA.md` |
| Crawler | `docs/CRAWLER_FRAMEWORK.md` |
| Queues | `docs/QUEUE_AND_WORKERS.md` |
| Compose | `docs/DOCKER_COMPOSE.md` |
| Coding Standards | `docs/CODING_STANDARDS.md` |
| Testing | `docs/TESTING.md` |
| Releases | `docs/RELEASE.md` |
| Cursor / Agents | `docs/CURSOR_DEVELOPMENT.md`, `AGENTS.md` |
| CI/CD | `docs/CI_CD.md` |
