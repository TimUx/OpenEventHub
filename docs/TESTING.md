# Testing Strategy

- Unit Tests
- Integration Tests (Compose/Stack/monitoring validate, plugin loader verify, restore dry-run)
- Contract Tests (API GraphQL/REST service-level)
- End-to-End smoke (`scripts/e2e-smoke.sh` against a running stack)
- Performance smoke (`scripts/perf-smoke.sh` latency budget against public API)

Every plugin must be loadable via `npm run verify:plugins`.

## Local

```bash
npm test
npm run verify:plugins
npm run tools:check
npm run validate:compose
npm run validate:stack
npm run validate:monitoring
npm run restore:dry-run
```

## Running stack smokes

With Compose or Swarm published and DNS/`Host` headers resolving:

```bash
API_BASE=http://api.localhost ./scripts/e2e-smoke.sh
API_BASE=http://api.localhost ./scripts/perf-smoke.sh
```

These are intentional smokes (probes + HTTP latency), not full browser E2E or capacity benchmarks.

## CI

Quality Gates workflow (`.github/workflows/ci.yml`) runs lint, typecheck, workspace
tests, plugin verify, compose/stack/monitoring validation, restore dry-run,
representative Docker builds, and security scans. See `docs/CI_CD.md`.
