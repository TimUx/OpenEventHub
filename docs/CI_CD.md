# CI/CD

> Sprache: Deutsch (primär) · [English](en/CI_CD.md)

GitHub Actions erzwingen dokumentationsgetriebene Quality Gates und SemVer-Releases.

## Workflows

| Workflow | Trigger | Zweck |
|----------|---------|-------|
| `.github/workflows/ci.yml` | Push/PR auf `main`, `develop` | Lint, Tests, Plugin-Verify, Compose-/Stack-/Monitoring-Validate, Restore-Dry-Run, Docker-Builds, Security-Scan |
| `.github/workflows/release.yml` | Push-Tag `v*` | GHCR-Images bauen/pushen + GitHub Release aus `CHANGELOG.md` |

## CI-Jobs

1. **Lint, Typecheck, Unit- & Contract-Tests** — Prettier, ESLint, `tsc`, `npm test`, `verify:plugins`
2. **Compose-/Stack-Integrations-Validate** — `validate:compose`, `validate:stack`, `validate:monitoring`, `restore:dry-run`, Plugin-Contract
3. **Docker-Build** — `api`, `frontend`, `admin`, `crawler` (Buildx, kein Push)
4. **Security-Scan** — `npm audit --audit-level=critical`, Trivy-Filesystem (CRITICAL lässt das Gate scheitern; HIGH wird gemeldet)

## Release (SemVer-Tags)

```bash
# Nach CHANGELOG + Version-Bump gemäß docs/RELEASE.md
git tag -a v0.11.0 -m "v0.11.0"
git push origin v0.11.0
```

Images werden nach GHCR veröffentlicht:

`ghcr.io/<owner>/openeventhub-<service>:<version>` und `:latest`

Services: api, frontend, admin, crawler, scheduler, ocr-service, ai-service, search, worker.

## Lokale Entsprechungen

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
npm run validate:stack
npm run validate:monitoring
npm run restore:dry-run
```

Siehe auch: `docs/CURSOR_DEVELOPMENT.md`, `docs/RELEASE.md`, `docs/DEPLOYMENT.md`, `AGENTS.md`.
