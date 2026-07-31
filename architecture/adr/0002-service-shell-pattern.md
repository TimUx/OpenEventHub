# ADR 0002: Service Shell Pattern for Architecture Skeleton

- Status: Accepted
- Date: 2026-07-31
- Milestone: M2 Architecture Skeleton

## Context

Milestone 2 must introduce all documented application containers with
`/health`, `/ready`, and `/metrics`, without domain features yet.
Duplicating bootstrap code across nine services would create drift.

## Decision

1. Provide `@openeventhub/service-runtime` — shared NestJS module for:
   - structured logging bootstrap
   - `/health`, `/ready`, `/metrics` controllers
   - environment-based service identity (`SERVICE_NAME`, `SERVICE_VERSION`)
2. Each backend service (`api`, `scheduler`, `worker`, `crawler`, `ai-service`,
   `ocr-service`, `search`) is a thin NestJS application that imports the runtime
   module and declares its readiness checks (postgres/redis/object-storage as applicable).
3. `frontend` and `admin` are separate Next.js applications exposing the same
   probe paths via App Router route handlers.
4. Compose wires all services onto `edge`/`internal` networks; Traefik routes
   public entrypoints (`api`, `frontend`, `admin`).
5. Synchronous HTTP and asynchronous BullMQ remain the communication styles
   from `docs/COMMUNICATION.md`; M2 only establishes process boundaries.

## Consequences

### Positive

- Identical probe contracts across services
- Fast, consistent addition of domain modules in later milestones
- Clear hexagonal seam: runtime is infrastructure; domain arrives later

### Negative

- NestJS footprint for lightweight workers is heavier than raw Node workers
  (accepted for stack consistency with documentation)

## Alternatives considered

| Alternative                             | Why rejected                                    |
| --------------------------------------- | ----------------------------------------------- |
| One process hosting all roles           | Violates “no monoliths” / container-per-service |
| Copy-paste NestJS bootstrap per service | Drift and review burden                         |
| Custom minimal HTTP servers for workers | Diverges from NestJS backend standard           |
