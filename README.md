# OpenEventHub

> AI-powered Open Source Event Intelligence Platform

## Vision

OpenEventHub is **not** a traditional event calendar.

It continuously discovers, crawls, analyzes, deduplicates and enriches events from distributed sources such as websites, RSS, ICS, social media, PDFs, images (OCR), open data portals, and APIs.

Multiple sources become **one** high-quality event record.

## Current status

**Milestone 5 — Crawler Framework (`v0.5.0`)**

- Infrastructure: Traefik, PostgreSQL, Redis, SeaweedFS
- All application containers with `/health`, `/ready`, `/metrics`
- Prisma domain model + AI Engine (Admin-managed providers)
- Plugin SDK + HTML/RSS/ICS plugins, scheduler → crawl → OCR/AI queues

Next: **Milestone 6 — Public API**. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Quick start

Requirements: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
npm run stack:up
```

Or step by step:

```bash
npm run infra:bootstrap
npm run apps:up
npm run apps:health
```

| Entry              | URL (defaults)              |
| ------------------ | --------------------------- |
| Frontend           | http://localhost:8088       |
| API                | http://api.localhost:8088   |
| Admin              | http://admin.localhost:8088 |
| Traefik dashboard  | http://localhost:18080      |
| PostgreSQL (host)  | `localhost:15432`           |
| Redis (host)       | `localhost:16379`           |
| S3 API (SeaweedFS) | http://localhost:18333      |
| Storage Admin UI   | http://localhost:23646      |

Containers reach each other via Docker DNS (`postgres`, `redis`, `object-storage`, `api`, …).

## Repository layout

```
architecture/     ADRs + milestone reviews
docker/           Compose + Stack + DB init
docs/             Binding product & engineering docs
packages/         Shared libraries
services/         Deployable service containers
plugins/          Source connector plugins (from M5)
prompts/          Central LLM prompts (from M4)
scripts/          Bootstrap and ops helpers
```

## Core principles

- Container First · API First · AI First · Plugin Based
- Docker Compose + Docker Stack
- Documentation is the source of truth

## Documentation

- [Vision](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
