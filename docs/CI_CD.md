# CI/CD

GitHub Actions pipelines are expanded in **Milestone 10**. Until then, contributors
run local gates (`docs/DEVELOPER_GUIDE.md`, `docs/RELEASE.md`).

## Planned pipelines (M10+)

- Lint
- Unit Tests
- Integration Tests
- Docker Build
- Security Scan
- Publish Images
- Release (SemVer tags)

## Local stand-ins (M9)

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
npm run validate:stack
```
