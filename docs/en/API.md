# REST & GraphQL API

> Language: English · [Deutsch (primary)](../API.md)

## Principles

- API First
- Versioned (`/api/v1`)
- OpenAPI 3.1 document at `/api/docs-json` (Swagger UI: `/api/docs`)
- GraphQL endpoint at `POST /graphql`
- JWT authentication for admin routes
- Rate limiting (`API_RATE_LIMIT` / `API_RATE_LIMIT_TTL_MS`)

## Core Resources

- Events (published)
- Categories
- Regions
- Search
- Public event / source submissions (moderation queue)
- Admin ops: dashboard, sources, crawler, scheduler, queues, moderation, users, AI settings (JWT + RBAC)

## Auth & RBAC

- `POST /api/v1/auth/login` issues a Bearer JWT
- Admin routes require roles `admin`, `moderator`, and/or `viewer` (see `REST_ENDPOINTS.md`)
- User management is `admin`-only
- Audit hooks emit structured log lines for login and admin mutations
