# ADR 0003: Prisma as the Sole Data Access Layer

- Status: Accepted
- Date: 2026-07-31
- Milestone: M3 Data Model

## Context

OpenEventHub persists a rich domain model (events, sources, crawl pipeline,
moderation, AI analysis) described in `docs/DATA_MODEL.md` and
`docs/DATABASE_SCHEMA.md`. Multiple services will eventually read and write data,
but the platform must keep schema evolution traceable and avoid ad-hoc SQL drift.

Milestone 3 introduces the first persistent layer. We need a single, typed access
pattern that supports migrations, repositories, and strict TypeScript contracts.

## Decision

1. Use **Prisma** in `@openeventhub/database` as the **only** data access layer
   for application code.
2. Own the schema, migrations, seed data, and repository classes in
   `packages/database`; the API service is the primary writer in early milestones.
3. **Prohibit raw SQL strings** in application and service code. Allowed
   exceptions:
   - Prisma-generated query APIs (`findMany`, `create`, transactions, etc.)
   - `$queryRaw` / `$executeRaw` **only** for documented operational probes
     (e.g. readiness `SELECT 1`) — never for domain queries.
4. Schema changes require a committed Prisma migration under
   `packages/database/prisma/migrations/`.
5. Reference data (regions, categories) is seeded via `prisma db seed`; domain
   writes go through repositories or explicit Prisma calls inside the database
   package boundary.

## Consequences

### Positive

- Typed models aligned with documentation and ER diagram
- Repeatable migrations for Compose and Swarm deployments
- Central place for schema review and repository tests
- Event versioning enforced at the model layer (append-only `EventVersion`)

### Negative

- Services that need direct DB access must depend on `@openeventhub/database`
  (acceptable until queue/API contracts fully decouple reads)
- Complex reporting queries may eventually need Prisma views or dedicated read
  models rather than raw SQL in services

## Alternatives considered

| Alternative                    | Why rejected                                              |
| ------------------------------ | --------------------------------------------------------- |
| TypeORM / Drizzle in services  | Split schemas increase drift; docs specify Prisma for M3  |
| Raw SQL in NestJS repositories | Violates traceability and type safety goals               |
| Per-service schemas            | Conflicts with single logical event model across pipeline |
