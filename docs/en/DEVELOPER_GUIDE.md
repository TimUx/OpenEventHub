# Developer Guide

> Language: English · [Deutsch (primary)](../DEVELOPER_GUIDE.md)

Contributor guide for the running OpenEventHub platform (Compose + Stack).
Documentation under `docs/` is binding — if code and docs diverge, change the code.

## Principles

- Clean Architecture / DDD / Hexagonal / SOLID
- API First · Plugin First · AI First · Container First
- One milestone at a time (`docs/ROADMAP.md`)
- No host runtime dependency for **running** the platform (Docker only)
- Host Node 20+ is optional for contributor tooling; prefer `npm run tools:*`

## Repository layout

```
architecture/   ADRs + milestone reviews
docker/         Compose, Stack, Traefik / Postgres assets
docs/           Binding documentation
packages/       Shared libraries (npm workspaces)
services/       One directory per deployable container
plugins/        Source connectors (SDK-based)
prompts/        Centralized LLM prompts (only place for prompts)
scripts/        Bootstrap and ops helpers
```

### Packages

| Package | Role |
|---------|------|
| `@openeventhub/shared` | Service names, queue names, health helpers, crawl/AI job contracts |
| `@openeventhub/database` | Prisma schema, client, repositories |
| `@openeventhub/plugin-sdk` | Crawl plugin TypeScript contracts |
| `@openeventhub/ai-core` | LLM provider adapters + key encryption |
| `@openeventhub/service-runtime` | NestJS health / ready / metrics shell |

### Services

| Service | Port (container) | Role |
|---------|------------------|------|
| `api` | 3000 | REST `/api/v1`, GraphQL, OpenAPI, admin APIs |
| `frontend` | 3100 | Public portal |
| `admin` | 3101 | Operator center |
| `scheduler` | — | Registers repeatable crawl jobs from `Source.scheduleCron` |
| `crawler` | — | Plugin crawl pipeline + object storage |
| `ocr-service` | — | Tesseract OCR queue consumer |
| `ai-service` | — | Event Intelligence Engine |
| `search` | — | Search index worker (shell) |
| `worker` | — | Generic worker shell |

Communication: HTTP APIs and Redis/BullMQ queues (`docs/COMMUNICATION.md`, `docs/QUEUE_AND_WORKERS.md`).

## Local stack (day one)

Requirements: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
# Edit secrets in .env (never commit real secrets)

npm run infra:bootstrap   # Traefik, Postgres, Redis, SeaweedFS
bash scripts/db-migrate.sh  # preferred: container on internal network
# npm run db:migrate      # Host Node only with docker-compose.dev-ports.yml

npm run db:seed           # or: bash scripts/db-seed.sh
npm run apps:up           # build + start all app containers
npm run apps:health       # wait until healthy
```

Shortcut after `.env` exists:

```bash
npm run stack:up          # apps:up + apps:health
```

### Useful URLs (defaults from `.env.example`)

| Entry | URL |
|-------|-----|
| Frontend | http://localhost:8088 |
| API | http://api.localhost:8088 |
| OpenAPI | http://api.localhost:8088/api/docs |
| GraphQL | http://api.localhost:8088/graphql |
| Admin | http://admin.localhost:8088 |
| Traefik dashboard | http://traefik.localhost:8088 |

Bootstrap admin (from `.env`): `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`.

AI provider keys are **not** set via env — configure them in Admin → AI Settings after login.

### Ops helpers

```bash
npm run infra:ps
npm run infra:logs
npm run infra:down
npm run validate:compose
npm run validate:stack
```

Script details: `scripts/bootstrap-infra.sh`, `check-infra-health.sh`, `check-apps-health.sh`,
`db-migrate.sh`, `db-seed.sh`, `run-in-node.sh`, `verify-plugins.sh`.

## Contributor tooling

Prefer containerized Node 22 (no host dependency):

```bash
npm run tools:check       # ci-like: format, lint, typecheck, test
npm run tools:lint
npm run tools:test
npm run verify:plugins    # plugin.json + createPlugin smoke check
```

With a local Node ≥ 20.11:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run verify:plugins
npm run validate:compose
```

## Environment

Copy `.env.example` → `.env`. Contributors usually need:

- `POSTGRES_*`, `DATABASE_URL`
- `REDIS_PASSWORD`
- `S3_*` / SeaweedFS ports
- `SETTINGS_ENCRYPTION_KEY`, `AUTH_JWT_SECRET`
- `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`
- `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL`
- Traefik ports (`TRAEFIK_HTTP_PORT`, …)

Optional: `PLUGINS_DIR` (Compose crawler defaults to `/app/plugins` baked into the image).

## Working on plugins

New sources = plugins only. Do not change crawler core for a new source type.

1. Read `docs/PLUGIN_SDK.md` and `docs/PLUGIN_DEVELOPMENT.md`
2. Follow the worked example in `docs/PLUGIN_EXAMPLE.md` (`plugins/html`)
3. Add `plugins/<name>/plugin.json` + `index.js`
4. Rebuild crawler (`npm run apps:up`) so the image picks up plugins
5. Create a Source in Admin with matching `pluginType`
6. Run `npm run verify:plugins`

## Working on API / Admin / Frontend

- Public API: `docs/API.md`, `docs/REST_ENDPOINTS.md`
- Admin center: `docs/ADMIN_CENTER.md` (UI at `admin.localhost`)
- Frontend: `docs/FRONTEND.md`, `docs/SEO.md`
- Contract/unit tests live next to services (`*.test.ts`); run via workspace or `tools:test`

## Milestone & git discipline

1. Implement **exactly one** milestone from `docs/ROADMAP.md`
2. Exit criteria: code + tests + docs + architecture review note
3. Conventional Commits; SemVer release notes in `CHANGELOG.md` (see `docs/RELEASE.md`)
4. Prefer small commits; do not invent architecture that contradicts ADRs

## Where to read next

| Topic | Doc |
|-------|-----|
| Architecture | `docs/ARCHITECTURE.md` |
| Data model | `docs/DATA_MODEL.md`, `docs/DATABASE_SCHEMA.md` |
| Crawler | `docs/CRAWLER_FRAMEWORK.md` |
| Queues | `docs/QUEUE_AND_WORKERS.md` |
| Compose | `docs/DOCKER_COMPOSE.md` |
| Coding standards | `docs/CODING_STANDARDS.md` |
| Testing | `docs/TESTING.md` |
| Releases | `docs/RELEASE.md` |
| Cursor / agents | `docs/CURSOR_DEVELOPMENT.md`, `AGENTS.md` |
| CI/CD | `docs/CI_CD.md` |
