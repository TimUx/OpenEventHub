# Docker Compose

OpenEventHub runs infrastructure and application services with Docker Compose.

## Files

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.yml` | Infrastructure (Traefik, Postgres, Redis, SeaweedFS) |
| `docker/compose/docker-compose.apps.yml` | Application service containers |
| `docker/stack/docker-stack.yml` | Swarm Stack skeleton (production hardening in later milestones) |
| `.env.example` | Environment template |

## Core infrastructure

- traefik
- postgres
- redis
- object-storage (SeaweedFS S3; bucket via `S3_BUCKET`)

## Application services

- frontend, admin, api, scheduler, worker, crawler, ai-service, ocr-service, search

Each long-running service has healthcheck, restart policy, and env-based config.
The crawler image **copies** `plugins/` and sets `PLUGINS_DIR=/app/plugins`.

## Commands

```bash
cp .env.example .env
npm run infra:bootstrap   # infrastructure only + health wait
npm run db:migrate && npm run db:seed
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

Apply migrations and seed reference data (requires Postgres from infra):

```bash
npm run db:migrate          # host Node, uses DATABASE_URL from .env
bash scripts/db-migrate.sh  # containerized, host network

npm run db:seed
bash scripts/db-seed.sh

# One-shot via Compose profile
docker compose -f docker/compose/docker-compose.yml \
  -f docker/compose/docker-compose.apps.yml \
  --env-file .env --profile tools run --rm migrate
```

Seed creates the bootstrap admin from `ADMIN_BOOTSTRAP_EMAIL` /
`ADMIN_BOOTSTRAP_PASSWORD`. Configure AI providers in the Admin UI (not via env).

## Traefik URLs (defaults from `.env.example`)

- Frontend: http://localhost:8088 (Host `localhost`)
- API: http://api.localhost:8088
- Admin: http://admin.localhost:8088
- Traefik dashboard: http://localhost:18080
- PostgreSQL (host): `localhost:15432`
- Redis (host): `localhost:16379`
- S3 API: http://localhost:18333
- Storage Admin UI: http://localhost:23646
