# Testing Strategy

- Unit Tests
- Integration Tests (Compose/Stack validate, plugin loader verify)
- Contract Tests (API GraphQL/REST service-level)
- End-to-End Tests (expanded in later milestones)
- Performance Tests (M11+)

Every plugin must be loadable via `npm run verify:plugins`.

## Local

```bash
npm test
npm run verify:plugins
npm run tools:check
```

## CI

Quality Gates workflow (`.github/workflows/ci.yml`) runs lint, typecheck, workspace
tests, plugin verify, compose/stack validation, representative Docker builds, and
security scans. See `docs/CI_CD.md`.
