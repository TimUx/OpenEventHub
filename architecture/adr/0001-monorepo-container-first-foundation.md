# ADR 0001: Monorepo & Container-First Foundation

- Status: Accepted
- Date: 2026-07-31
- Milestone: M1 Foundation

## Context

OpenEventHub is specified as a multi-service, container-first platform
(Compose + Swarm). The repository initially contained documentation only.
We need a foundation that:

1. Matches `docs/ARCHITECTURE.md` and `docs/CONTAINERS.md`
2. Requires no host-installed runtime for infrastructure
3. Supports many independently deployable services and plugins
4. Enforces shared TypeScript contracts early

## Decision

1. Use a **npm workspaces monorepo** with:
   - `services/*` — deployable containers
   - `packages/*` — shared libraries
   - `plugins/*` — source connectors
   - `prompts/` — centralized AI prompts
   - `docker/` — Compose and Stack definitions
2. Run **infrastructure via Docker Compose** from day one (Traefik, PostgreSQL, Redis, SeaweedFS (see ADR 0004)).
3. Keep a **Docker Stack skeleton** for Swarm production deployment.
4. Put cross-cutting contracts in `@openeventhub/shared` (service names, queues, health payloads).
5. Treat **documentation as source of truth**; code must follow docs.

## Consequences

### Positive

- Single reviewable history for platform changes
- Shared types prevent drift between services
- Contributors start with `docker compose` only
- Clear path to Swarm (overlay networks, secrets, rolling updates)

### Negative

- Monorepo CI must eventually build selectively
- Workspace tooling requires Node ≥ 20 for contributor scripts (app runtime remains containerized)

## Alternatives considered

| Alternative                            | Why rejected                                                             |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Polyrepo per service                   | Too heavy for early OSS contribution; shared contracts harder            |
| Host-local Postgres/Redis              | Violates Container First / no host dependency                            |
| Start with full NestJS/Next apps in M1 | Violates one-milestone rule; Foundation must stay infrastructure-focused |
