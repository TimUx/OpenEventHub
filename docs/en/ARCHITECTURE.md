# OpenEventHub Architecture

> Language: English · [Deutsch (primary)](../ARCHITECTURE.md)

## Architecture principles

- Container First
- API First
- Plugin First
- Event-Driven
- AI-Assisted
- Horizontal scalability

## High-level overview

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
    PublicSubmit[Public submission]-->API
    API-->Moderation
```

## Core services

| Service | Responsibility |
|---------|----------------|
| Frontend | Public portal (list, calendar, map, search, submit) |
| Admin | Administration & moderation |
| API | REST & GraphQL |
| Scheduler | Starts crawl jobs |
| Worker | Background processing |
| Crawler | Collects raw data (plugins) |
| AI Engine | Extraction & deduplication |
| OCR | Reads PDFs & images |
| Search | Full-text & semantic search |
| PostgreSQL | Primary database |
| Redis | Queue & cache |
| SeaweedFS (S3) | Object storage |
| Traefik | Sole host entrypoint (edge) |

## Network separation

```mermaid
flowchart TB
  subgraph Host
    Browser
  end

  subgraph edge["edge (publicly routed)"]
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

See `docs/COMMUNICATION.md` and `docs/DOCKER_COMPOSE.md`.
