# Roadmap

This roadmap is the binding development plan for OpenEventHub.
It derives from the documentation packages and the current repository state
(documentation complete, implementation not started).

Status legend: `planned` · `in_progress` · `done`

---

## Current State (2026-07-31)

| Area | Status |
|------|--------|
| Vision / Architecture / Data / AI / Plugins / API / Frontend / Ops docs | complete |
| Application code | none |
| Docker Compose / Stack | none |
| Prisma / Database | none |
| CI/CD | none |
| Plugins / Prompts | directories only |

---

## Priority Order

1. Establish a container-first foundation that runs without host dependencies
2. Codify service boundaries and shared contracts (Architecture)
3. Persist the documented domain model (Prisma + migrations)
4. Build AI and crawler pipelines behind queues
5. Expose versioned public APIs
6. Ship public frontend and admin
7. Harden ops (monitoring, backup, moderation workflows)
8. Complete developer / Cursor guidance for contributors

Never implement multiple large milestones in parallel.

---

## Milestone Plan

### M1 — Foundation (`Package 01`) · `done`

**Goal:** Professional monorepo and infrastructure base. `docker compose up` starts core data/edge services with healthchecks. No business logic yet.

**Deliverables**

- Git repository, Conventional Commits, SemVer (`0.1.0`)
- Monorepo layout aligned with container architecture
- Shared TypeScript / ESLint / Prettier baseline
- Docker Compose: Traefik, PostgreSQL, Redis, MinIO
- Docker Stack skeleton for Swarm
- Environment templates, scripts, healthcheck conventions
- CI skeleton (lint / validate compose)
- Cursor rules reflecting binding documentation
- ADR-0001 (monorepo & container-first foundation)
- README / CHANGELOG / CONTRIBUTING / LICENSE

**Exit criteria**

- `docker compose` brings infra to healthy state
- No host Node/DB required to run infrastructure
- Docs describe how to start and extend

---

### M2 — Architecture Skeleton (`Package 02`) · `planned`

**Goal:** Service boundaries as runnable containers with health/ready/metrics and shared libraries — still without domain features.

**Deliverables**

- NestJS API shell (`/health`, `/ready`, `/metrics`)
- Worker / Scheduler / Crawler / AI / OCR / Search shells
- Next.js Frontend + Admin shells
- Shared packages: config, logging, messaging contracts
- Internal Docker network wiring via Traefik
- ADRs for communication (HTTP vs BullMQ) and hexagon ports

**Exit criteria**

- Full stack compose starts all application containers
- Services report healthy; no domain endpoints yet

---

### M3 — Data Model (`Package 03`) · `planned`

**Goal:** Prisma schema matching `DATA_MODEL.md` / `DATABASE_SCHEMA.md` with migrations, versioning, and repositories.

**Deliverables**

- Prisma schema for Event, EventVersion, Source, Crawl*, AIAnalysis, etc.
- Initial migration + seed for regions/categories
- Database package owned by API (others via API/queue contracts)
- Unit/integration tests for repositories

**Exit criteria**

- Migrations apply cleanly in Compose
- No raw SQL in application code

---

### M4 — AI Engine (`Package 04`) · `planned`

**Goal:** Exchangeable OpenAI-compatible AI service with centralized prompts.

**Deliverables**

- AI service with provider abstraction (OpenAI, Azure, OpenRouter, Ollama-ready)
- Central `prompts/` catalog
- Pipeline stages: extraction, classification, confidence
- Queue consumer for AI jobs
- Tests with provider fakes at the port boundary (not business mocks)

**Exit criteria**

- Provider switch via env only
- No prompts embedded in application source

---

### M5 — Crawler Framework (`Package 05`) · `planned`

**Goal:** Plugin-first discovery/fetch/parse pipeline with Scheduler + Workers.

**Deliverables**

- Plugin SDK (`packages/plugin-sdk`)
- BullMQ queues: Discovery, Crawl, OCR, AI, Geocoding, Search, Notifications
- Scheduler service + crawler worker
- First plugins: HTML, RSS, ICS
- OCR service (Tesseract) + MinIO raw storage
- Plugin auto-registration

**Exit criteria**

- New source type = new plugin only (no core changes)
- End-to-end crawl of a fixture source into raw storage

---

### M6 — Public API (`Package 06`) · `planned`

**Goal:** Versioned REST + GraphQL with OpenAPI/Swagger, JWT, RBAC, rate limits.

**Deliverables**

- `/api/v1` resources from `REST_ENDPOINTS.md`
- GraphQL schema
- Auth (JWT), RBAC, audit log hooks
- OpenAPI 3.1 + Swagger UI
- Contract tests

**Exit criteria**

- Documented endpoints implemented and tested
- Rate limiting and health endpoints live

---

### M7 — Frontend (`Package 07`) · `planned`

**Goal:** Public portal: list, calendar, map, search, SEO.

**Deliverables**

- Next.js + Tailwind + shadcn/ui
- Views from `FRONTEND.md` / `SEARCH_UI.md` / `SEO.md`
- Dark mode, a11y, Schema.org, OpenGraph
- Integration against API

**Exit criteria**

- Responsive portal against real API data
- SEO metadata on event pages

---

### M8 — Administration (`Package 08`) · `planned`

**Goal:** Admin center for ops and moderation.

**Deliverables**

- Dashboard, sources, crawler, scheduler, AI, users/roles, moderation
- Logs / queue visibility
- RBAC-protected admin routes

**Exit criteria**

- Operators can manage sources and moderation without DB access

---

### M9 — Developer Experience (`Package 09`) · `planned`

**Goal:** Contributor-ready developer guide matching the running system.

**Deliverables**

- Updated `DEVELOPER_GUIDE.md`, plugin guides, local (compose) workflows
- Example plugin walkthrough verified against code
- Changelog discipline and release notes process

---

### M10 — Cursor & Quality Gates (`Package 10`) · `planned`

**Goal:** Enforce documentation-driven development in the IDE and CI.

**Deliverables**

- Complete Cursor rule set
- CI: lint, unit, integration, docker build, security scan
- Release workflow (SemVer tags, image publish)

---

### M11 — Production Hardening · `planned`

**Goal:** Production-ready Swarm deployment and operability.

**Deliverables**

- Docker Stack with secrets, configs, rolling updates
- Monitoring (Prometheus/Grafana/Loki) per `MONITORING.md`
- Backup/restore per `BACKUP.md`
- Performance and E2E suites

**Exit criteria**

- Swarm deploy documented and verified
- Backup restore tested
- Platform considered production-ready

---

## Package Mapping

| Package | Milestone |
|---------|-----------|
| 01 Foundation | M1 |
| 02 Architecture | M2 |
| 03 Data Model | M3 |
| 04 AI Engine | M4 |
| 05 Crawler Framework | M5 |
| 06 API | M6 |
| 07 Frontend | M7 |
| 08 Administration | M8 |
| 09 Developer Guide | M9 |
| 10 Cursor Development Guide | M10 |
| Ops / Prod | M11 |

---

## Working Rules

1. Documentation always wins over code.
2. One milestone at a time.
3. After each milestone: architecture review, code review, docs, tests.
4. Conventional Commits + SemVer.
5. No TODOs, placeholders, or dead code in merged work.
