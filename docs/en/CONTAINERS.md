# Container Architecture

> Language: English · [Deutsch (primary)](../CONTAINERS.md)

```mermaid
flowchart TB
subgraph Edge["edge — host only via Traefik"]
TR[Traefik]
FE[Frontend]
ADM[Admin]
API[API]
end

subgraph Internal["internal — no host port"]
SCH[Scheduler]
CR[Crawler]
WK[Workers]
AI[AI Service]
OCR[OCR]
SRCH[Search]
PG[(PostgreSQL)]
RD[(Redis)]
OBJ[(SeaweedFS S3)]
end

Browser((Browser))-->TR
TR-->FE
TR-->ADM
TR-->API
FE-.->|API_INTERNAL_URL|API
API-->PG
API-->RD
SCH-->RD
CR-->RD
CR-->OBJ
WK-->RD
AI-->PG
AI-->RD
OCR-->OBJ
SRCH-->RD
```

## Port policy

| Exposed on host | Services |
|-----------------|----------|
| Traefik HTTP/HTTPS | Frontend, Admin, API, Traefik UI, Grafana (Host header) |
| None | Postgres, Redis, SeaweedFS, Worker, Crawler, AI, OCR, Search, Prometheus, Loki |

Optional for local tooling: `docker/compose/docker-compose.dev-ports.yml`.
