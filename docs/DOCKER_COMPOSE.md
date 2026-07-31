# Docker Compose

OpenEventHub runs infrastructure and application services with Docker Compose.

## Files

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.yml` | Infrastructure (Traefik, Postgres, Redis, SeaweedFS) |
| `docker/compose/docker-compose.apps.yml` | Application service containers |
| `docker/stack/docker-stack.yml` | Swarm Stack skeleton |
| `.env.example` | Environment template |

## Core infrastructure

- traefik
- postgres
- redis
- object-storage (SeaweedFS S3; bucket via `S3_BUCKET`)

## Application services (M2+)

- frontend, admin, api, scheduler, worker, crawler, ai-service, ocr-service, search

Each long-running service has healthcheck, restart policy, and env-based config.

## Commands

```bash
cp .env.example .env
npm run infra:bootstrap   # infrastructure only
npm run apps:up           # infra + apps (build)
npm run apps:health
npm run infra:down
```

## Database (M3+)

Apply migrations and seed reference data (requires Postgres from infra):

```bash
npm run db:migrate          # host Node, uses DATABASE_URL from .env
bash scripts/db-migrate.sh  # containerized, Compose network

npm run db:seed
bash scripts/db-seed.sh

# One-shot via Compose profile
docker compose -f docker/compose/docker-compose.yml \
  -f docker/compose/docker-compose.apps.yml \
  --env-file .env --profile tools run --rm migrate
```

Traefik (default host ports from `.env.example`):

- Frontend: http://localhost:8088 (Host `localhost`)
- API: http://api.localhost:8088
- Admin: http://admin.localhost:8088
