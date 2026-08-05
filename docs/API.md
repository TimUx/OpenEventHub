# REST & GraphQL API

> Sprache: Deutsch (primär) · [English](en/API.md)

## Prinzipien

- API First
- Versioniert (`/api/v1`)
- OpenAPI-3.1-Dokument unter `/api/docs-json` (Swagger UI: `/api/docs`)
- GraphQL-Endpoint unter `POST /graphql`
- JWT-Authentifizierung für Admin-Routen
- Rate Limiting (`API_RATE_LIMIT` / `API_RATE_LIMIT_TTL_MS`)

## Kernressourcen

- Events (published)
- Categories
- Regions
- Search
- Öffentliche Event-/Source-Submissions (Moderations-Queue)
- Admin-Ops: Dashboard, Sources, Crawler, Scheduler, Queues, Moderation, Users, AI Settings (JWT + RBAC)

## Auth & RBAC

- `POST /api/v1/auth/login` stellt ein Bearer-JWT aus
- Admin-Routen erfordern die Rollen `admin`, `moderator` und/oder `viewer` (siehe `REST_ENDPOINTS.md`)
- User-Management ist nur für `admin`
- Audit-Hooks schreiben strukturierte Logzeilen für Login und Admin-Mutationen
