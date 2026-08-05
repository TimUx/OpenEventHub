# API

OpenEventHub public REST + GraphQL API.

## Endpoints

- REST `/api/v1/*` — events, categories, regions, search, submissions
- GraphQL `POST /graphql`
- OpenAPI/Swagger UI `/api/docs`
- Auth `POST /api/v1/auth/login`
- Admin AI `/api/v1/admin/ai/*` (JWT + RBAC)
- Probes `/health`, `/ready`, `/metrics`

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `POSTGRES_*` | Persistence |
| `AUTH_JWT_SECRET` | JWT signing |
| `API_RATE_LIMIT` | Max requests per window (default 120) |
| `API_RATE_LIMIT_TTL_MS` | Window size in ms (default 60000) |
