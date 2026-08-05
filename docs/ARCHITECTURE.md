# OpenEventHub-Architektur

> Sprache: Deutsch (primär) · [English](en/ARCHITECTURE.md)

## Architekturprinzipien

- Container First
- API First
- Plugin First
- Event-Driven
- AI-Assisted
- Horizontale Skalierbarkeit

## Überblick auf hoher Ebene

```mermaid
flowchart LR
    Sources-->Crawler
    Crawler-->Queue
    Queue-->AI
    AI-->Database
    Database-->API
    API-->Frontend
    API-->Admin
    Database-->Search
    PublicSubmit[Öffentliche Einreichung]-->API
    API-->Moderation
```

## Kernservices

| Service | Verantwortung |
|----------|----------------|
| Frontend | Öffentliches Portal (Liste, Kalender, Karte, Suche, Einreichen) |
| Admin | Administration & Moderation |
| API | REST & GraphQL |
| Scheduler | Startet Crawl-Jobs |
| Worker | Hintergrundverarbeitung |
| Crawler | Sammelt Rohdaten (Plugins) |
| AI Engine | Extraktion & Deduplizierung |
| OCR | Liest PDFs & Bilder |
| Search | Volltext- & semantische Suche |
| PostgreSQL | Primäre Datenbank |
| Redis | Queue & Cache |
| SeaweedFS (S3) | Objektspeicher |
| Traefik | Einziger Host-Entrypoint (edge) |

## Netzwerktrennung

```mermaid
flowchart TB
  subgraph Host
    Browser
  end

  subgraph edge["edge (öffentlich geroutet)"]
    TR[Traefik]
    FE[Frontend]
    ADM[Admin]
    API[API]
    GF[Grafana]
  end

  subgraph internal["internal (internal: true)"]
    PG[(PostgreSQL)]
    RD[(Redis)]
    OBJ[(SeaweedFS)]
    SCH[Scheduler]
    CR[Crawler]
    WK[Worker]
    AI[AI]
    OCR[OCR]
    SRCH[Search]
    PROM[Prometheus]
    LOKI[Loki]
  end

  Browser -->|HTTP/HTTPS| TR
  TR --> FE
  TR --> ADM
  TR --> API
  TR --> GF
  API --> PG
  API --> RD
  FE -->|API_INTERNAL_URL| API
  SCH --> RD
  CR --> RD
  CR --> OBJ
  WK --> RD
  AI --> PG
  AI --> RD
  OCR --> OBJ
  PROM --> API
  PROM --> SCH
  PROM --> CR
  GF --> PROM
  GF --> LOKI
```

Siehe `docs/COMMUNICATION.md` und `docs/DOCKER_COMPOSE.md`.
