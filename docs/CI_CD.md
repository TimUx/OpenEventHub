# CI/CD

GitHub Actions enforce documentation-driven quality gates and SemVer releases.

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `.github/workflows/ci.yml` | Push/PR to `main`, `develop` | Lint, tests, plugin verify, compose/stack validate, Docker builds, security scan |
| `.github/workflows/release.yml` | Push tag `v*` | Build/push GHCR images + GitHub Release from `CHANGELOG.md` |

## CI jobs

1. **Lint, typecheck, unit & contract tests** — Prettier, ESLint, `tsc`, `npm test`, `verify:plugins`
2. **Compose / Stack integration validate** — `validate:compose`, `validate:stack`, plugin contract
3. **Docker build** — `api`, `frontend`, `admin`, `crawler` (Buildx, no push)
4. **Security scan** — `npm audit --audit-level=critical`, Trivy filesystem (CRITICAL fails the gate; HIGH is reported)

## Release (SemVer tags)

```bash
# After CHANGELOG + version bump per docs/RELEASE.md
git tag -a v0.10.0 -m "v0.10.0"
git push origin v0.10.0
```

Images published to GHCR:

`ghcr.io/<owner>/openeventhub-<service>:<version>` and `:latest`

Services: api, frontend, admin, crawler, scheduler, ocr-service, ai-service, search, worker.

## Local stand-ins

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
npm run validate:stack
```

See also: `docs/CURSOR_DEVELOPMENT.md`, `docs/RELEASE.md`, `AGENTS.md`.
