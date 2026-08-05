# REST & GraphQL API

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
- Admin AI settings (JWT + RBAC)

## Auth & RBAC

- `POST /api/v1/auth/login` issues a Bearer JWT
- Admin AI routes require roles `admin` or `moderator`
- Audit hooks emit structured log lines for login, reads, and submissions
