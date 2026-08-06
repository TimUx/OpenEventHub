# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.17.0] - 2026-08-06

### Added

- Optional / external Ollama: `OLLAMA_DEPLOY`, `OLLAMA_EXTERNAL_NETWORK`, GPU overlay; Swarm Ollama as optional stack files
- Admin **Error log** (`/logs`) and `GET /api/v1/admin/logs/errors` (queues, crawl jobs, source errors)
- Admin CRUD for categories, regions, and events (event updates write `EventVersion`)
- Schedule presets (shared) for sources / public submit; one scheduler tick per distinct cron; serial crawls
- AI ingest creates `pending_moderation` events from extraction; taxonomy **find-or-create** linking
- Content preparation for large HTML before LLM calls; extraction/classification prompts 1.0.1

### Changed

- Brand mark (calendar binders + hub); quieter homepage hero
- Bundled Ollama no longer required in Compose/Swarm base; seed/profile still default to Local Ollama URL from env
- Docs (DE/EN) and UI screenshots refreshed

### Fixed

- Unchanged content-hash crawls still re-enqueue OCR/AI for recovery
- Admin `logs` route was blocked by root `logs/` gitignore; ignore narrowed to `/logs/`

## [0.16.1] - 2026-08-06

### Changed

- Event list filters and calendar export/subscribe are collapsible panels (collapsed by default) so the focus stays on events
- Docs and UI screenshots refreshed for the quieter tools chrome

## [0.16.0] - 2026-08-06

### Added

- Bulk calendar download: export all currently visible (filtered) events as one `.ics` file
- Online calendar subscription feed: `GET /calendar.ics` (portal) and `GET /api/v1/calendar.ics` (API), with optional category/region/date filters
- Shared ICS builder (`@openeventhub/shared`) used by API feed and portal downloads
- Subscribe UI on `/events` and `/calendar` (copy HTTPS URL + `webcal://` subscribe)

### Changed

- Docs (`FRONTEND`, `REST_ENDPOINTS`) and UI screenshots refreshed for calendar export/subscribe

## [0.15.0] - 2026-08-06

### Added

- Event list flat filter bar: category, region, date range (from/to), sort by start date or title, ascending/descending

### Changed

- Event actions (map / calendar) are icon-only buttons with hover/`aria-label` tooltips
- Public event cards no longer show a redundant `PUBLISHED` status label
- Docs and UI screenshots refreshed

## [0.14.1] - 2026-08-06

### Changed

- Portal/Admin header: language and accent controls are compact icon buttons (like dark/light); language click toggles DE ↔ EN
- Docs and UI screenshots refreshed for the quieter header chrome

## [0.14.0] - 2026-08-05

### Added

- SEO: richer sitemap (static routes + published events), hardened `robots.txt`, canonical/Open Graph/Twitter metadata, Organization/WebSite JSON-LD, crawlable event links on calendar/map
- PWA: web app manifest, install icons (192/512 + maskable), Apple touch icon, production service worker for shell caching
- Brand mark assets in portal/admin headers and docs (`docs/assets/brand/`)
- Responsive portal: bottom navigation on phones/tablets, safe-area insets, touch-friendly controls

### Changed

- Search pages are `noindex` and omitted from the sitemap
- Docs: `SEO.md`, `FRONTEND.md` (mobile/PWA), screenshots refreshed

## [0.13.0] - 2026-08-05

### Added

- Event actions on lists and detail pages: **Show on map** (`/map?event=<id>`) and **Add to calendar** (`.ics` download)
- Selectable portal accent colors (WCAG AA-safe light/dark pairs) next to light/dark mode
- Admin AI Settings: edit (PATCH) and delete provider profiles
- Compose/Stack **Ollama** service on the internal network plus one-shot `ollama-pull` for the default model
- Seed keeps **Local Ollama** (`http://ollama:11434/v1`) and activates it when no provider is active

### Changed

- Locale switcher on primary app bars uses a solid light chip for readable native dropdowns
- Default AI catalog/seed Ollama base URL points at the Compose service DNS name `ollama`
- Docs: AI configuration, Admin Center, Frontend appearance, Compose service list, REST AI endpoints

### Fixed

- Provider profiles could not be edited or deleted in the Admin UI (API already supported both)

## [0.12.0] - 2026-08-05

### Added

- Embedded OpenStreetMap map (Leaflet) with search/filters and auto-fitBounds
- Public submission UI (`/submit`) for events and sources → moderation queue
- Flat FestSchmiede-inspired UI tokens (primary blue, teal, green; Roboto; solid app bar)
- Optional Compose overlay `docker-compose.dev-ports.yml` for local host tooling ports
- Event list/API payloads include venue coordinates and categories for map filtering
- Bilingual docs under `docs/` (DE primary) and `docs/en/`; UI screenshots refreshed

### Changed

- Docker networking: `internal` (`internal: true`) for data plane; host publishes only Traefik HTTP/HTTPS
- Workers/crawler/AI/OCR/search no longer attach to the public `edge` network
- Postgres, Redis, SeaweedFS, Prometheus, Loki no longer publish host ports by default
- Migrate/seed scripts attach to the internal Docker network instead of host networking
- Traefik dashboard reachable via `traefik.${DOMAIN}` on the main HTTP port (no dedicated dashboard port)
- Frontend views: calendar day/week/month/year; events list/details/tiles; i18n `de`/`en`

## [0.11.0] - 2026-08-05

### Added

- Production Docker Swarm stack with secrets, configs, rolling updates, placement, and resource limits
- Secrets entrypoint for Nest images (`docker/scripts/load-secrets-entrypoint.sh`)
- Monitoring overlay: Prometheus, Grafana, Loki, Promtail (`docker/monitoring/`)
- Backup + restore dry-run scripts; E2E and performance smoke scripts
- Domain Prometheus metrics: HTTP latency, crawl/AI duration, failed imports, queue depth
- Ops docs: DEPLOYMENT, DOCKER_STACK, MONITORING, BACKUP, TESTING updates

### Changed

- CI integration job validates monitoring compose and restore dry-run

## [0.10.0] - 2026-08-05

### Added

- Complete Cursor rule set (`.cursor/rules/`) plus `AGENTS.md` and `docs/CURSOR_DEVELOPMENT.md`
- Quality Gates CI: lint/typecheck/tests, plugin verify, compose/stack validate, Docker builds, Trivy + npm audit
- Release workflow for `v*` tags: GHCR image publish and GitHub Release from CHANGELOG

### Changed

- CI/CD, RELEASE, and TESTING docs aligned with automated gates

## [0.9.0] - 2026-08-05

### Added

- Contributor Developer Guide aligned with Compose stack, packages, and services
- Plugin SDK / development / HTML example docs verified against `plugins/` and crawler loader
- `npm run verify:plugins` smoke check for manifests and `createPlugin` factories
- Release process doc (`docs/RELEASE.md`) for SemVer + Keep a Changelog discipline

### Changed

- Compose, Contributing, GitHub workflow, and plugins README updated for M5–M8 reality

## [0.8.0] - 2026-08-05

### Added

- Admin API for dashboard, sources CRUD + crawl trigger, moderation decisions, users/roles, crawler jobs, scheduler reload, and queue visibility
- Admin center UI with JWT auth shell covering all Admin Center views
- Database repositories for moderation and admin users; expanded source/crawl/event queries
- BullMQ integration in API for operator enqueue and queue introspection

## [0.7.0] - 2026-08-05

### Added

- Public Next.js portal with Tailwind and shadcn-style UI primitives
- Views: Home, Event List, Event Detail, Calendar, Map, Search
- Dark mode, Schema.org JSON-LD, OpenGraph metadata, sitemap and robots
- TanStack Query client integration against `/api/v1`
- Frontend Compose wiring (`NEXT_PUBLIC_API_BASE_URL`, `API_INTERNAL_URL`, site URL)

## [0.6.0] - 2026-08-05

### Added

- Public REST `/api/v1` resources: events, categories, regions, search, submissions
- GraphQL endpoint (`POST /graphql`) with events/search queries and submit mutations
- OpenAPI document + Swagger UI (`/api/docs`, `/api/docs-json`)
- Global API rate limiting (skips health probes)
- RBAC roles guard for admin AI routes and audit log hooks

## [0.5.0] - 2026-08-05

### Added

- Plugin SDK (`@openeventhub/plugin-sdk`) and first plugins: HTML, RSS, ICS
- Crawler BullMQ consumer for `crawl` with plugin auto-registration and SeaweedFS/S3 raw storage
- Scheduler registers repeatable crawl jobs from `Source.scheduleCron`
- OCR service BullMQ consumer for `ocr` (Tesseract.js) with AI hand-off
- Content-hash skip for unchanged crawl payloads
- Crawl/OCR job contracts in `@openeventhub/shared`

### Changed

- Crawler and OCR default to S3 object storage in Compose (`OBJECT_STORAGE_ADAPTER=s3`)

## [0.4.1] - 2026-07-31

### Added

- Admin-managed AI provider profiles (ChatGPT/OpenAI, Claude/Anthropic, Gemini/Google, Azure, OpenRouter, Ollama, custom)
- `@openeventhub/ai-core` with OpenAI-compatible, Anthropic, and Gemini adapters + AES-GCM key encryption
- Admin auth (`POST /api/v1/auth/login`) and AI Settings API (`/api/v1/admin/ai/*`)
- Admin UI page `/ai-settings`
- ADR 0006: admin-managed AI configuration

### Changed

- AI provider credentials no longer come from `AI_*` environment variables (ADR 0005 §3 superseded)
- Seed creates bootstrap admin user and default Local Ollama profile
- Traefik bumped to `v3.6.7` (Docker Engine API negotiation)
- Prisma `binaryTargets` include `debian-openssl-3.0.x` for container runtime

## [0.4.0] - 2026-07-31

### Added

- Event Intelligence Engine in `ai-service` (extraction → classification → confidence)
- Central prompt catalog under `prompts/` (`event-extraction`, `event-classification`)
- OpenAI-compatible LLM provider adapter (OpenAI, Azure, OpenRouter, Ollama via env)
- BullMQ consumer for the `ai` queue
- ADR 0005: exchangeable OpenAI-compatible AI provider

## [0.3.1] - 2026-07-31

### Changed

- Replace MinIO with SeaweedFS (`object-storage`) as S3-compatible object store (ADR 0004)
- Rename database columns `minio_key` → `object_key`

## [0.3.0] - 2026-07-31

### Added

- `@openeventhub/database` Prisma package with full domain schema and initial migration
- Event and Source repository classes with unit and integration tests
- Seed data for regions (Germany → Bayern → München) and categories (Music, Sports, Culture)
- Root database scripts: `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- Container migration/seed scripts: `scripts/db-migrate.sh`, `scripts/db-seed.sh`
- ADR 0003: Prisma as the sole data access layer
- Expanded `docs/DATABASE_SCHEMA.md` matching the implemented schema

## [0.2.0] - 2026-07-31

### Added

- `@openeventhub/service-runtime` NestJS module for `/health`, `/ready`, `/metrics`
- Backend service shells: api, scheduler, worker, crawler, ai-service, ocr-service, search
- Frontend and admin Next.js shells with the same probe contracts
- Docker Compose apps overlay and Traefik routes for api/frontend/admin
- ADR 0002: service shell pattern
- Application health script (`npm run apps:health`)

## [0.1.0] - 2026-07-31

### Added

- Monorepo foundation with npm workspaces and shared TypeScript baseline
- `@openeventhub/shared` contracts (service names, queues, health payloads)
- Docker Compose infrastructure: Traefik, PostgreSQL, Redis, MinIO
- Docker Stack (Swarm) skeleton with secrets/placement placeholders
- Bootstrap and infrastructure health scripts
- Containerized Node 22 tooling (`scripts/run-in-node.sh`, `npm run tools:*`)
- GitHub Actions CI (lint, typecheck, tests, compose validation)
- Cursor rules enforcing documentation-driven development
- ADR 0001: Monorepo & container-first foundation
- Detailed milestone roadmap (`docs/ROADMAP.md`)
- Apache-2.0 license, contributing guide, environment template
