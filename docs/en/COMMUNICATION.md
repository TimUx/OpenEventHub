# Service Communication

> Language: English · [Deutsch (primary)](../COMMUNICATION.md)

- HTTP/REST for synchronous requests
- GraphQL for client queries
- Redis/BullMQ for asynchronous jobs
- No direct database access except owning services where applicable

## Docker networks

| Network | Type | Purpose |
|---------|------|---------|
| `edge` | bridge / overlay | Traefik + publicly routed surfaces (frontend, admin, API, Grafana) |
| `internal` | bridge / overlay, `internal: true` | Postgres, Redis, SeaweedFS, worker/crawler/AI/OCR/search, Prometheus/Loki |

The host publishes **only** Traefik (`TRAEFIK_HTTP_PORT` / `TRAEFIK_HTTPS_PORT`). All service-to-service calls use Docker DNS on `internal` or `edge` (e.g. `API_INTERNAL_URL=http://api:3000`).

Optional host ports for local tooling: overlay `docker/compose/docker-compose.dev-ports.yml`.

## Crawl Flow

1. Scheduler creates a job
2. Worker executes the crawler plugin
3. Raw content is stored
4. AI extracts the structured event
5. Duplicate detection
6. Persist event
7. Update search index
