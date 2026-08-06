# Example Endpoints

> Language: English · [Deutsch (primary)](../REST_ENDPOINTS.md)

## Public

```
GET    /api/v1/events
GET    /api/v1/events/{id}
GET    /api/v1/calendar.ics
POST   /api/v1/submissions
POST   /api/v1/source-submissions
GET    /api/v1/categories
GET    /api/v1/regions
GET    /api/v1/search?q=
```

## Auth / Admin (JWT)

```
POST   /api/v1/auth/login

GET    /api/v1/admin/dashboard                 (admin|moderator|viewer)
GET    /api/v1/admin/events
GET    /api/v1/admin/categories
GET    /api/v1/admin/regions

GET|POST|PATCH|DELETE /api/v1/admin/sources*   (mutations: admin|moderator; delete: admin)
POST   /api/v1/admin/sources/{id}/crawl

GET    /api/v1/admin/moderation
POST   /api/v1/admin/moderation/{id}/decide    (admin|moderator)

GET|POST|PATCH|DELETE /api/v1/admin/users*     (admin only)

GET    /api/v1/admin/crawler/jobs
GET|POST /api/v1/admin/scheduler*
GET    /api/v1/admin/queues

GET    /api/v1/admin/ai/providers              (admin|moderator)
GET    /api/v1/admin/ai/providers/catalog      (admin|moderator)
POST   /api/v1/admin/ai/providers              (admin|moderator)
PATCH  /api/v1/admin/ai/providers/:id          (admin|moderator)
DELETE /api/v1/admin/ai/providers/:id          (admin|moderator)
GET    /api/v1/admin/ai/settings               (admin|moderator)
PUT    /api/v1/admin/ai/settings               (admin|moderator)
POST   /api/v1/admin/ai/providers/:id/test     (admin|moderator)
```

## GraphQL

```
POST   /graphql
```

## Docs / probes

```
GET    /api/docs
GET    /api/docs-json
GET    /health
GET    /ready
GET    /metrics
```
