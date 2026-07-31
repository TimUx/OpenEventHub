# Docker Compose

OpenEventHub runs infrastructure and (from M2) application services with Docker Compose.

## Files

| File | Purpose |
|------|---------|
| `docker/compose/docker-compose.yml` | Development / single-node Compose |
| `docker/stack/docker-stack.yml` | Swarm Stack skeleton |
| `.env.example` | Environment template |

## Core services (M1)

- traefik
- postgres
- redis
- minio
- minio-init (bucket bootstrap)

Application services (frontend, admin, api, scheduler, worker, crawler, ai-service, ocr-service, search) are added in Milestone 2+.

## Requirements per service

Each long-running service has:

- healthcheck
- restart policy
- persistent volumes where needed
- environment-based configuration

## Commands

```bash
cp .env.example .env
npm run infra:bootstrap
npm run infra:health
npm run infra:logs
npm run infra:down
```
