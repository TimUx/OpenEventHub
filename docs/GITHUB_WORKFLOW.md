# GitHub-Workflow

> Sprache: Deutsch (primär) · [English](en/GITHUB_WORKFLOW.md)

## Branches

- `main` — stabile Integrationslinie
- `develop` — optionale Staging-Linie für Multi-Contributor-Flows
- `feature/*` — neue Arbeit
- `bugfix/*` — Fixes
- `hotfix/*` — dringende Production-Fixes von `main`

## Pull Requests

Jede Änderung landet über einen Pull Request mit Review, wenn Collaborators beteiligt sind.
Solo-Milestone-Commits auf `main` folgen trotzdem Conventional Commits und
`docs/RELEASE.md`.

CI (Lint, Tests, Image-Build, Security) wird in Milestone 10 ausgebaut. Bis dahin
lokale Gates ausführen:

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
```

## Commits

Conventional Commits nutzen (`feat`, `fix`, `docs`, `chore`, …). Milestone-Releases
heben SemVer und `CHANGELOG.md` wie in `docs/RELEASE.md` beschrieben an.
