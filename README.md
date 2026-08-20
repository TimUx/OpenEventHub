# OpenEventHub

> KI-gestützte Open-Source **Event-Intelligence-Plattform**

[English README](README.en.md)

## Vision

OpenEventHub ist **kein** klassischer Veranstaltungskalender.

Die Plattform entdeckt, crawlt, analysiert, dedupliziert und anreichert Veranstaltungen aus verteilten Quellen (Websites, RSS, ICS, Social Media, PDFs, Bilder/OCR, Open-Data-Portale, APIs).

Mehrere Quellen werden zu **einem** hochwertigen Veranstaltungsdatensatz.

## Aktueller Stand

**v0.27.0 — Import coverage region tree** (post-M11)

Vorher: v0.26.1 — Safer venue locality normalize

- Docker Swarm Stack mit Secrets, Monitoring (Prometheus/Grafana/Loki), Backup/Restore
- Public Portal, Admin Center, API, Crawler-Plugins, Quality Gates

Siehe [`docs/ROADMAP.md`](docs/ROADMAP.md) · [English](docs/en/ROADMAP.md).

## Schnellstart

Voraussetzung: Docker Engine + Docker Compose v2.

```bash
cp .env.example .env
npm run stack:up
```

Oder Schritt für Schritt:

```bash
npm run infra:bootstrap
npm run apps:up
npm run apps:health
```

| Einstieg          | URL (Defaults)                |
| ----------------- | ----------------------------- |
| Frontend          | http://localhost:8088         |
| API               | http://api.localhost:8088     |
| Admin             | http://admin.localhost:8088   |
| Traefik-Dashboard | http://traefik.localhost:8088 |

## Dokumentation

**Primärsprache: Deutsch** · Englisch unter [`docs/en/`](docs/en/)

- [Dokumentationsindex](docs/README.md) · [English index](docs/en/README.md)
- [Vision](docs/VISION.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Frontend](docs/FRONTEND.md) / [Admin Center](docs/ADMIN_CENTER.md) (inkl. Screenshots)
- [Mitwirken](CONTRIBUTING.md)

## Kernprinzipien

- Container First · API First · AI First · Plugin Based
- Docker Compose + Docker Stack
- Dokumentation ist die Source of Truth (`docs/` verbindlich)

## Lizenz

Apache-2.0 — siehe [`LICENSE`](LICENSE).
