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

Public event payloads include `categories` and optional `media[]` (`type`, `url`, `altText`, `sortOrder`; MVP: remote URLs from crawl/JSON-LD/`og:image`).

## Auth / Admin (JWT)

```
POST   /api/v1/auth/login

GET    /api/v1/admin/dashboard                 (admin|moderator|viewer)
GET    /api/v1/admin/events                    (query: status, dateFrom, dateTo, q, venue, allDay, limit)
GET    /api/v1/admin/events/counts             (counts by status, e.g. pending_moderation)
GET    /api/v1/admin/events/{id}
PATCH  /api/v1/admin/events/{id}               (admin|moderator; writes EventVersion; optional `venue: { id?, name?, address?, regionId? } | null`, `categoryIds: string[]`)
DELETE /api/v1/admin/events/{id}               (admin only)
GET    /api/v1/admin/venues                    (query: q, limit — venue search for event editing)
POST   /api/v1/admin/geocoding/backfill        (enqueue venues/regions missing coordinates onto `geocoding`)
GET|POST|PATCH|DELETE /api/v1/admin/categories*  (mutations: admin|moderator; delete: admin)
GET|POST|PATCH|DELETE /api/v1/admin/regions*     (mutations: admin|moderator; delete: admin)
GET /api/v1/admin/regions/lookup?q=…             (DE place lookup via Nominatim)
POST /api/v1/admin/regions/from-lookup           (hierarchy find-or-create; body `{ chain }`)
GET|PUT /api/v1/admin/coverage-scope             (coverage area; PUT body `{ regionIds: string[] }`)
GET|PUT /api/v1/admin/category-import-allowlist  (category allowlist; PUT body `{ categoryIds: string[] }`)

GET|POST|PATCH|DELETE /api/v1/admin/sources*   (mutations: admin|moderator; delete: admin)
POST   /api/v1/admin/sources/{id}/crawl

GET    /api/v1/admin/moderation
POST   /api/v1/admin/moderation/{id}/decide    (admin|moderator)

GET|PATCH /api/v1/admin/me                     (own profile; PATCH requires `currentPassword`)
GET|POST|PATCH|DELETE /api/v1/admin/users*     (admin only; PATCH: email/role/password)

GET    /api/v1/admin/crawler/jobs
GET|POST /api/v1/admin/scheduler*
GET    /api/v1/admin/queues
GET    /api/v1/admin/queues/failed             (BullMQ failedReason + payload summary)
GET    /api/v1/admin/logs/errors               (aggregated errors: queues, crawl jobs, Source.lastError)

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
