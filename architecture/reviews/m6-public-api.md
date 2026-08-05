# Milestone 6 Review — Public API

Date: 2026-08-05
Version: 0.6.0
Status: Accepted for completion; next is M7 Frontend

## Architecture review

- Versioned REST under `/api/v1` matching `docs/REST_ENDPOINTS.md`
- GraphQL schema at `POST /graphql` matching `docs/GRAPHQL.md`
- OpenAPI document exposed via Swagger UI
- JWT admin auth retained; RBAC roles guard on admin AI routes
- Rate limiting via Nest Throttler (probes excluded)
- Audit hooks as structured logs (no separate audit table yet)

## Code review

- Repositories extended for published events, categories, regions, submissions
- Public submissions create `user_submissions` + pending `moderation_items`
- Contract tests cover REST endpoints and GraphQL query

## Verification

| Check              | Result                |
| ------------------ | --------------------- |
| API contract tests | pass (tsx)            |
| Compose config     | updated for API 0.6.0 |

## Follow-ups (M7+)

- Frontend portal against these endpoints
- Dedicated audit persistence table
- Richer OpenAPI DTO schemas / GraphQL JSON object literals
