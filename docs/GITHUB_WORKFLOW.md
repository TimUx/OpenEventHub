# GitHub Workflow

## Branches

- `main` — stable integration line
- `develop` — optional staging line for multi-contributor flows
- `feature/*` — new work
- `bugfix/*` — fixes
- `hotfix/*` — urgent production fixes from `main`

## Pull requests

Every change lands via Pull Request with review when collaborators are involved.
Solo milestone commits on `main` still follow Conventional Commits and
`docs/RELEASE.md`.

CI (lint, tests, image build, security) is expanded in Milestone 10. Until then
run local gates:

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
```

## Commits

Use Conventional Commits (`feat`, `fix`, `docs`, `chore`, …). Milestone releases
bump SemVer and `CHANGELOG.md` as described in `docs/RELEASE.md`.
