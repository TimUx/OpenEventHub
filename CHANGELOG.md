# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
