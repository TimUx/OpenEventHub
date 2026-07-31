# OpenEventHub

> AI-powered Open Source Event Intelligence Platform

## Vision

OpenEventHub is **not** a traditional event calendar.

It continuously discovers, crawls, analyzes, deduplicates and enriches events from distributed sources such as websites, RSS, ICS, social media, PDFs, images (OCR), open data portals, and APIs.

Multiple sources become **one** high-quality event record.

## Current status

**Milestone 1 — Foundation (`v0.1.0`)** is in place:

- Documentation-complete platform specification in `docs/`
- Container-first infrastructure via Docker Compose (Traefik, PostgreSQL, Redis, MinIO)
- Docker Stack skeleton for Swarm
- Shared TypeScript contracts (`@openeventhub/shared`)
- CI, coding standards, Cursor rules, ADR process

Application services (API, crawler, AI, frontend, admin) start in **Milestone 2**.
See the full plan in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Quick start (infrastructure)

Requirements: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
npm run infra:bootstrap
# or: bash scripts/bootstrap-infra.sh
```

Check status:

```bash
npm run infra:ps
npm run infra:health
```

Stop:

```bash
npm run infra:down
```

| Service      | Default host endpoint (see `.env`) |
| ------------ | ---------------------------------- |
| Traefik      | http://localhost:18080 (dashboard) |
| Traefik HTTP | http://localhost:8088              |
| PostgreSQL   | `localhost:15432`                  |
| Redis        | `localhost:16379`                  |
| MinIO API    | http://localhost:19000             |
| MinIO UI     | http://localhost:19001             |

Containers reach each other via Docker DNS (`postgres`, `redis`, `minio`, …), not these host ports.

Change credentials in `.env` before any shared or production use.

## Repository layout

```
architecture/     ADRs
docker/           Compose + Stack + DB init
docs/             Binding product & engineering docs
packages/         Shared libraries
services/         Deployable service containers (placeholders until M2)
plugins/          Source connector plugins (from M5)
prompts/          Central LLM prompts (from M4)
scripts/          Operational helpers
```

## Core principles

- Container First · API First · AI First · Plugin Based
- Docker Compose + Docker Stack
- Documentation is the source of truth

## Documentation

Start here:

- [Vision](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE).
