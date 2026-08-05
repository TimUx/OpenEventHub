# Monitoring

> Sprache: Deutsch (primär) · [English](en/MONITORING.md)

OpenEventHub liefert ein Compose-Overlay für Prometheus, Grafana, Loki und Promtail.

## Stack

| Komponente | Rolle |
|-----------|------|
| Prometheus | Scraped Nest `/metrics` |
| Grafana | Dashboards (Prometheus- + Loki-Datasources provisioniert) |
| Loki | Log-Aggregation |
| Promtail | Leitet Docker-Container-Logs an Loki weiter |

## Starten (Compose)

Benötigt infra- + apps-Netzwerke aus dem Haupt-Compose-Projekt:

```bash
docker compose -f docker/compose/docker-compose.yml \
  -f docker/compose/docker-compose.apps.yml \
  -f docker/monitoring/docker-compose.monitoring.yml \
  --env-file .env up -d
```

Konfiguration validieren ohne Container zu starten:

```bash
npm run validate:monitoring
```

Defaults: Grafana unter `http://grafana.${DOMAIN}:${TRAEFIK_HTTP_PORT}` (Traefik). Prometheus und Loki haben **keine** Host-Ports — nur im `internal`-Netz.

`GRAFANA_ADMIN_PASSWORD` in `.env` vor jeder nicht-lokalen Nutzung ändern.

## Metrics

Jeder Nest-Service exponiert Prometheus-Text unter `GET /metrics`.

| Metric | Quelle | Bedeutung |
|--------|--------|---------|
| `process_uptime_seconds` | all | Process-Uptime |
| `process_resident_memory_bytes` | all | RSS |
| `oeh_service_info` | all | Service-Name + Version |
| `oeh_http_requests_total` | all | HTTP-Request-Zähler (ohne Probes) |
| `oeh_http_request_duration_seconds` | all | HTTP-Latenz-Histogramm |
| `oeh_crawl_duration_seconds` | crawler | Dauer des Crawl-Jobs |
| `oeh_failed_imports_total` | crawler | Fehlgeschlagene Crawl-/Import-Zähler |
| `oeh_ai_processing_duration_seconds` | ai-service | Dauer der AI-Pipeline |
| `oeh_queue_length` / `oeh_queue_failed` | api | BullMQ-Tiefe (Aktualisierung ~15s) |

Scrape-Targets sind in `docker/monitoring/prometheus.yml` definiert.

## Logs

Promtail entdeckt Compose-Container über den Docker-Socket und leitet stdout/stderr an Loki weiter. Abfragen in Grafana Explore mit `{service="api"}` (wenn Compose-Service-Labels vorhanden sind).

## Swarm

Dieselben Monitoring-Images an die Swarm-Overlay-Netzwerke `openeventhub_internal` / `openeventhub_edge` anbinden, oder das Compose-Monitoring-Overlay gegen diese externen Netzwerke nach `docker stack deploy` betreiben. Grafana-Admin-Credentials in Production in Swarm Secrets halten.
