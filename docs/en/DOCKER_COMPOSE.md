# Docker Compose

> Language: English · [Deutsch (primary)](../DOCKER_COMPOSE.md)

OpenEventHub runs infrastructure and application services with Docker Compose.

## Files

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.yml` | Infrastructure (Traefik, Postgres, Redis, SeaweedFS, optional Ollama) |
| `docker/compose/docker-compose.apps.yml` | Application service containers |
| `docker/compose/docker-compose.ollama-gpu.yml` | Optional/automatic: NVIDIA GPU for bundled Ollama |
| `docker/compose/docker-compose.ollama-external.yml` | Optional: attach API/AI to an external Ollama network |
| `docker/compose/docker-compose.dev-ports.yml` | Optional: host ports for local tooling |
| `docker/stack/docker-stack.yml` | Swarm stack (production) |
| `docker/stack/docker-stack.ollama.yml` | Swarm: optional bundled Ollama |
| `docker/stack/docker-stack.ollama-gpu.yml` | Swarm: GPU reservation for bundled Ollama |
| `.env.example` | Environment template |

## Networks & ports

- **`edge`**: Traefik + frontend, admin, API (and Grafana in the monitoring overlay)
- **`internal`** (`internal: true`): databases, object storage, worker services — **no** host ports
- Host publishes Traefik only: `TRAEFIK_HTTP_PORT` (default `8088`), `TRAEFIK_HTTPS_PORT` (default `8443`)

Details: `docs/COMMUNICATION.md`.

## Core infrastructure

- traefik
- postgres
- redis
- object-storage (SeaweedFS S3; bucket via `S3_BUCKET`)
- ollama (optional, Compose profile `ollama`; controlled by `OLLAMA_DEPLOY`) + one-shot `ollama-pull`
- With `OLLAMA_DEPLOY=1` and the NVIDIA toolkit: GPU overlay via `scripts/oeh-compose.sh`

## Application services

- frontend, admin, api, scheduler, worker, crawler, ai-service, ocr-service, search

Every long-lived service has a healthcheck, restart policy, and environment-based config.
The crawler image **copies** `plugins/` and sets `PLUGINS_DIR=/app/plugins`.

## Commands

```bash
cp .env.example .env
npm run infra:bootstrap   # infrastructure only + health wait
bash scripts/db-migrate.sh && bash scripts/db-seed.sh
npm run apps:up           # infra + apps (build)
npm run apps:health
npm run stack:up          # apps:up + apps:health
npm run infra:ps
npm run infra:logs
npm run infra:down

npm run validate:compose
npm run validate:stack
npm run tools:check       # lint/typecheck/test in Node 22 container
npm run verify:plugins
```

## Database

Migrations/seed run in a container on the **internal** network (hostname `postgres:5432`):

```bash
bash scripts/db-migrate.sh
bash scripts/db-seed.sh

# One-shot via Compose profile
docker compose -f docker/compose/docker-compose.yml \
  -f docker/compose/docker-compose.apps.yml \
  --env-file .env --profile tools run --rm migrate
```

Host `npm run db:migrate` needs the `docker-compose.dev-ports.yml` overlay (or a matching `DATABASE_URL`).

Seed creates the bootstrap admin from `ADMIN_BOOTSTRAP_EMAIL` /
`ADMIN_BOOTSTRAP_PASSWORD` and the **curated category catalog** (rural starter types;
further categories only via Admin). AI providers are configured in the Admin UI (not via env).

## Traefik URLs (defaults from `.env.example`)

- Frontend: http://localhost:8088 (Host `localhost`)
- API: http://api.localhost:8088
- Admin: http://admin.localhost:8088
- Traefik dashboard: http://traefik.localhost:8088
- Grafana (monitoring overlay): http://grafana.localhost:8088
