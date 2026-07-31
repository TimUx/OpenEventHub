# Docker Compose

OpenEventHub runs infrastructure and application services with Docker Compose.

## Files

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.yml` | Infrastructure (Traefik, Postgres, Redis, MinIO) |
| `docker/compose/docker-compose.apps.yml` | Application service containers |
| `docker/stack/docker-stack.yml` | Swarm Stack skeleton |
| `.env.example` | Environment template |

## Core infrastructure

- traefik
- postgres
- redis
- minio
- minio-init (bucket bootstrap)

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

Traefik (default host ports from `.env.example`):

- Frontend: http://localhost:8088 (Host `localhost`)
- API: http://api.localhost:8088
- Admin: http://admin.localhost:8088
