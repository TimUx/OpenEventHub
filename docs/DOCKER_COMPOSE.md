# Docker Compose

> Sprache: Deutsch (primär) · [English](en/DOCKER_COMPOSE.md)

OpenEventHub betreibt Infrastruktur- und Anwendungsservices mit Docker Compose.

## Dateien

| Datei | Zweck |
|------|---------|
| `docker/compose/docker-compose.yml` | Infrastruktur (Traefik, Postgres, Redis, SeaweedFS) |
| `docker/compose/docker-compose.apps.yml` | Anwendungsservice-Container |
| `docker/compose/docker-compose.dev-ports.yml` | Optional: Host-Ports für lokales Tooling |
| `docker/stack/docker-stack.yml` | Swarm-Stack (Production) |
| `.env.example` | Umgebungsvorlage |

## Netzwerke & Ports

- **`edge`**: Traefik + Frontend, Admin, API (und Grafana im Monitoring-Overlay)
- **`internal`** (`internal: true`): Datenbanken, Objektspeicher, Worker-Services — **keine** Host-Ports
- Host veröffentlicht nur Traefik: `TRAEFIK_HTTP_PORT` (Default `8088`), `TRAEFIK_HTTPS_PORT` (Default `8443`)

Details: `docs/COMMUNICATION.md`.

## Kerninfrastruktur

- traefik
- postgres
- redis
- object-storage (SeaweedFS S3; Bucket über `S3_BUCKET`)
- ollama (+ One-Shot `ollama-pull` für Default-Modell; `edge`+`internal` ohne Host-Port; siehe `docs/AI_CONFIGURATION.md`)

## Anwendungsservices

- frontend, admin, api, scheduler, worker, crawler, ai-service, ocr-service, search

Jeder langlebige Service hat Healthcheck, Restart-Policy und umgebungsbasierte Konfiguration.
Das Crawler-Image **kopiert** `plugins/` und setzt `PLUGINS_DIR=/app/plugins`.

## Befehle

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

## Datenbank

Migrationen/Seed laufen im Container am **internal**-Netz (Hostname `postgres:5432`):

```bash
bash scripts/db-migrate.sh
bash scripts/db-seed.sh

# One-shot via Compose profile
docker compose -f docker/compose/docker-compose.yml \
  -f docker/compose/docker-compose.apps.yml \
  --env-file .env --profile tools run --rm migrate
```

Host-`npm run db:migrate` braucht das Overlay `docker-compose.dev-ports.yml` (oder eine passende `DATABASE_URL`).

Seed legt den Bootstrap-Admin aus `ADMIN_BOOTSTRAP_EMAIL` /
`ADMIN_BOOTSTRAP_PASSWORD` an. AI-Provider werden in der Admin-UI konfiguriert (nicht über Env).

## Traefik-URLs (Defaults aus `.env.example`)

- Frontend: http://localhost:8088 (Host `localhost`)
- API: http://api.localhost:8088
- Admin: http://admin.localhost:8088
- Traefik-Dashboard: http://traefik.localhost:8088
- Grafana (Monitoring-Overlay): http://grafana.localhost:8088
