# Monitoring

> Language: English · [Deutsch (primary)](../MONITORING.md)

OpenEventHub ships a Compose overlay for Prometheus, Grafana, Loki, and Promtail.

## Stack

| Component | Role |
|-----------|------|
| Prometheus | Scrapes Nest `/metrics` |
| Grafana | Dashboards (Prometheus + Loki datasources provisioned) |
| Loki | Log aggregation |
| Promtail | Ships Docker container logs to Loki |

## Start (Compose)

Requires infra + apps networks from the main Compose project:

```bash
docker compose -f docker/compose/docker-compose.yml \
  -f docker/compose/docker-compose.apps.yml \
  -f docker/monitoring/docker-compose.monitoring.yml \
  --env-file .env up -d
```

Validate config without starting containers:

```bash
npm run validate:monitoring
```

Defaults: Grafana at `http://grafana.${DOMAIN}:${TRAEFIK_HTTP_PORT}` (Traefik). Prometheus and Loki have **no** host ports — internal network only.

Change `GRAFANA_ADMIN_PASSWORD` in `.env` before any non-local use.

## Metrics

Every Nest service exposes Prometheus text at `GET /metrics`.

| Metric | Source | Meaning |
|--------|--------|---------|
| `process_uptime_seconds` | all | Process uptime |
| `process_resident_memory_bytes` | all | RSS |
| `oeh_service_info` | all | Service name + version |
| `oeh_http_requests_total` | all | HTTP request count (excludes probes) |
| `oeh_http_request_duration_seconds` | all | HTTP latency histogram |
| `oeh_crawl_duration_seconds` | crawler | Crawl job duration |
| `oeh_failed_imports_total` | crawler | Failed crawl/import count |
| `oeh_ai_processing_duration_seconds` | ai-service | AI pipeline duration |
| `oeh_queue_length` / `oeh_queue_failed` | api | BullMQ depth (refreshed ~15s) |

Scrape targets are defined in `docker/monitoring/prometheus.yml`.

## Logs

Promtail discovers Compose containers via the Docker socket and forwards stdout/stderr to Loki. Query in Grafana Explore with `{service="api"}` (when Compose service labels are present).

## Swarm

Attach the same monitoring images to the Swarm `openeventhub_internal` / `openeventhub_edge` overlay networks, or run the Compose monitoring overlay against those external networks after `docker stack deploy`. Keep Grafana admin credentials in Swarm secrets for production.
