# Milestone 3 Review — Data Model

Date: 2026-07-31  
Version: 0.3.0  
Status: Accepted for completion; next is M4 AI Engine

## Architecture review

- ADR 0003 establishes Prisma as the sole data access layer
- `@openeventhub/database` owns schema, migrations, seed, and repositories
- All entities from `docs/DATA_MODEL.md` are modeled with UUID primary keys
- Event versioning is append-only via `EventVersion` snapshots
- Region and category hierarchies use self-referential `parentId`
- Event↔Category and Event↔Tag are many-to-many join tables

## Code review

- Prisma schema with enums: `EventStatus`, `SourceStatus`, `CrawlJobStatus`,
  `CrawlResultStatus`, `ModerationStatus`, `SubmissionType`, `MediaType`,
  `RegionType`
- Initial migration committed under `packages/database/prisma/migrations/`
- Seed: Germany → Bayern → München; Music/Sports/Culture with child categories
- Repositories: `EventRepository`, `SourceRepository`
- Root scripts: `db:generate`, `db:migrate`, `db:seed`, `db:studio`
- Container scripts: `scripts/db-migrate.sh`, `scripts/db-seed.sh`

## Verification

| Check                                | Result |
| ------------------------------------ | ------ |
| `prisma validate`                    | pass   |
| Repository unit tests                | pass   |
| Integration test (with DATABASE_URL) | pass   |
| `npm run db:migrate` via Compose     | pass   |
| `npm run db:seed`                    | pass   |
| `npm run typecheck`                  | pass   |

## Follow-ups (M4+)

- Wire API domain modules to `@openeventhub/database`
- Replace TCP postgres readiness with Prisma `$queryRaw` health probe in API
- Queue payloads reference entity IDs only; no cross-service SQL
