
# Container Architecture

```mermaid
flowchart TB
subgraph Edge
TR[Traefik]
end

subgraph Application
FE[Frontend]
ADM[Admin]
API[API]
SCH[Scheduler]
CR[Crawler]
WK[Workers]
AI[AI Service]
OCR[OCR]
SRCH[Search]
end

subgraph Data
PG[(PostgreSQL)]
RD[(Redis)]
MIN[(MinIO)]
end

TR-->FE
TR-->ADM
TR-->API
API-->PG
API-->RD
CR-->RD
WK-->AI
AI-->PG
OCR-->MIN
SRCH-->PG
