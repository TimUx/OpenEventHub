# Example Endpoints

## Public

```
GET    /api/v1/events
GET    /api/v1/events/{id}
POST   /api/v1/submissions
POST   /api/v1/source-submissions
GET    /api/v1/categories
GET    /api/v1/regions
GET    /api/v1/search?q=
```

## Auth / Admin

```
POST   /api/v1/auth/login
GET    /api/v1/admin/ai/*   (JWT + role admin|moderator)
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
