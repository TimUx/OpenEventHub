# GraphQL

> Language: English · [Deutsch (primary)](../GRAPHQL.md)

Endpoint: `POST /graphql`

Main Queries:

- `events`
- `event`
- `regions`
- `categories`
- `search`

Main Mutations:

- `submitEvent`
- `submitSource`

Example:

```graphql
query {
  events(limit: 10) {
    id
    title
    startAt
  }
}
```
