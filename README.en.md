# OpenEventHub

> AI-powered open-source **Event Intelligence Platform**

[Deutsche README (primär)](README.md)

## Vision

OpenEventHub is **not** a traditional event calendar.

It continuously discovers, crawls, analyzes, deduplicates and enriches events from distributed sources such as websites, RSS, ICS, social media, PDFs, images (OCR), open data portals, and APIs.

Multiple sources become **one** high-quality event record.

## Current status

**v0.12.0 — Portal UX, Map, Submit, Network Hardening** (post-M11)

Previous: Milestone 11 — Production Hardening (`v0.11.0`)

- Docker Swarm stack with secrets, monitoring (Prometheus/Grafana/Loki), backup/restore
- Public portal, Admin Center, API, crawler plugins, quality gates

See [`docs/en/ROADMAP.md`](docs/en/ROADMAP.md) · [Deutsch](docs/ROADMAP.md).

## Quick start

Requirements: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
npm run stack:up
```

| Entry              | URL (defaults)              |
| ------------------ | --------------------------- |
| Frontend           | http://localhost:8088         |
| API                | http://api.localhost:8088     |
| Admin              | http://admin.localhost:8088   |
| Traefik dashboard  | http://traefik.localhost:8088 |


## Documentation

**Primary language: German** in [`docs/`](docs/README.md). English alternatives: [`docs/en/`](docs/en/README.md).

## Core principles

- Container First · API First · AI First · Plugin Based
- Documentation is the source of truth

## License

Apache-2.0 — see [`LICENSE`](LICENSE).
