# Service-Kommunikation

> Sprache: Deutsch (primär) · [English](en/COMMUNICATION.md)

- HTTP/REST für synchrone Anfragen
- GraphQL für Client-Abfragen
- Redis/BullMQ für asynchrone Jobs
- Kein direkter Datenbankzugriff außer durch die zuständigen Services, wo zutreffend

## Docker-Netzwerke

| Netz | Typ | Zweck |
|------|-----|--------|
| `edge` | bridge / overlay | Traefik + öffentlich geroutete Surfaces (Frontend, Admin, API, Grafana) |
| `internal` | bridge / overlay, `internal: true` | Postgres, Redis, SeaweedFS, Worker/Crawler/AI/OCR/Search, Prometheus/Loki |

Host veröffentlicht **nur** Traefik (`TRAEFIK_HTTP_PORT` / `TRAEFIK_HTTPS_PORT`). Alle Service-zu-Service-Aufrufe laufen über Docker-DNS auf `internal` bzw. `edge` (z. B. `API_INTERNAL_URL=http://api:3000`).

Optionale Host-Ports für lokales Tooling: Overlay `docker/compose/docker-compose.dev-ports.yml`.

## Crawl-Ablauf

1. Scheduler erzeugt einen Job
2. Worker führt das Crawler-Plugin aus
3. Rohinhalt wird gespeichert
4. KI extrahiert die strukturierte Veranstaltung
5. Duplikaterkennung
6. Veranstaltung persistieren
7. Suchindex aktualisieren
