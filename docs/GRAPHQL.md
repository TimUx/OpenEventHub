# GraphQL

> Sprache: Deutsch (primär) · [English](en/GRAPHQL.md)

Endpoint: `POST /graphql`

Haupt-Queries:

- `events`
- `event`
- `regions`
- `categories`
- `search`

Haupt-Mutations:

- `submitEvent`
- `submitSource`

Beispiel:

```graphql
query {
  events(limit: 10) {
    id
    title
    startAt
  }
}
```
