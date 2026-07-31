# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
