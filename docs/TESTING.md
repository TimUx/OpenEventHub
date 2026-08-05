# Teststrategie

> Sprache: Deutsch (primär) · [English](en/TESTING.md)

- Unit Tests
- Integration Tests (Compose-/Stack-/Monitoring-Validate, Plugin-Loader-Verify, Restore-Dry-Run)
- Contract Tests (API GraphQL/REST auf Service-Ebene)
- End-to-End-Smoke (`scripts/e2e-smoke.sh` gegen einen laufenden Stack)
- Performance-Smoke (`scripts/perf-smoke.sh` Latenzbudget gegen die öffentliche API)

Jedes Plugin muss über `npm run verify:plugins` ladbar sein.

## Lokal

```bash
npm test
npm run verify:plugins
npm run tools:check
npm run validate:compose
npm run validate:stack
npm run validate:monitoring
npm run restore:dry-run
```

## Smokes gegen laufenden Stack

Mit veröffentlichtem Compose oder Swarm und auflösenden DNS-/`Host`-Headern:

```bash
API_BASE=http://api.localhost ./scripts/e2e-smoke.sh
API_BASE=http://api.localhost ./scripts/perf-smoke.sh
```

Das sind bewusst Smokes (Probes + HTTP-Latenz), keine vollständigen Browser-E2E- oder Kapazitätsbenchmarks.

## CI

Der Quality-Gates-Workflow (`.github/workflows/ci.yml`) führt Lint, Typecheck, Workspace-Tests, Plugin-Verify, Compose-/Stack-/Monitoring-Validation, Restore-Dry-Run, repräsentative Docker-Builds und Security-Scans aus. Siehe `docs/CI_CD.md`.
