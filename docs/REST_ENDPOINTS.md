# Example Endpoints

> Sprache: Deutsch (primär) · [English](en/REST_ENDPOINTS.md)

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
GET    /api/v1/admin/events                    (Query: status, dateFrom, dateTo, q, venue, allDay, limit)
GET    /api/v1/admin/events/counts             (Zähler je Status, z. B. pending_moderation)
GET    /api/v1/admin/events/{id}
PATCH  /api/v1/admin/events/{id}               (admin|moderator; schreibt EventVersion)
DELETE /api/v1/admin/events/{id}               (admin only)
GET|POST|PATCH|DELETE /api/v1/admin/categories*  (mutations: admin|moderator; delete: admin)
GET|POST|PATCH|DELETE /api/v1/admin/regions*     (mutations: admin|moderator; delete: admin)
GET /api/v1/admin/regions/lookup?q=…             (Ortssuche DE via Nominatim)
POST /api/v1/admin/regions/from-lookup           (Hierarchie Find-or-create; body `{ chain }`)
GET|PUT /api/v1/admin/coverage-scope             (Abdeckungsgebiet; PUT body `{ regionIds: string[] }`)
GET|PUT /api/v1/admin/category-import-allowlist  (Kategorie-Allowlist; PUT body `{ categoryIds: string[] }`)

GET|POST|PATCH|DELETE /api/v1/admin/sources*   (mutations: admin|moderator; delete: admin)
POST   /api/v1/admin/sources/{id}/crawl

GET    /api/v1/admin/moderation
POST   /api/v1/admin/moderation/{id}/decide    (admin|moderator)

GET|PATCH /api/v1/admin/me                     (eigenes Profil; PATCH braucht `currentPassword`)
GET|POST|PATCH|DELETE /api/v1/admin/users*     (admin only; PATCH: email/role/password)

GET    /api/v1/admin/crawler/jobs
GET|POST /api/v1/admin/scheduler*
GET    /api/v1/admin/queues
GET    /api/v1/admin/queues/failed             (BullMQ failedReason + Payload-Kurzinfo)
GET    /api/v1/admin/logs/errors               (aggregierte Fehler: Queues, Crawl-Jobs, Source.lastError)

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
