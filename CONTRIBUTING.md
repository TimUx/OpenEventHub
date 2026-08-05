# Mitwirken an OpenEventHub

Danke für deinen Beitrag. OpenEventHub ist dokumentationsgetrieben:
**`docs/` (Deutsch, verbindlich)** hat Vorrang vor informellen Shortcuts. Englisch: [`docs/en/`](docs/en/).

Lokale Workflows: [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md).
Cursor-/Agent-Regeln: [`docs/CURSOR_DEVELOPMENT.md`](docs/CURSOR_DEVELOPMENT.md), [`AGENTS.md`](AGENTS.md).
Release: [`docs/RELEASE.md`](docs/RELEASE.md) · CI: [`docs/CI_CD.md`](docs/CI_CD.md).

[English version](CONTRIBUTING.en.md)

## Prinzipien

- Container First — Entwickeln und Betreiben über Docker Compose / Stack
- Ein Milestone nach dem anderen (`docs/ROADMAP.md`)
- Plugin First für neue Quellen (`docs/PLUGIN_DEVELOPMENT.md`)
- Prompts nur unter `prompts/`
- Conventional Commits + SemVer

## Setup

```bash
cp .env.example .env
npm run infra:bootstrap
npm run db:migrate && npm run db:seed
npm run stack:up
```

## Quality Gates

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
npm run validate:stack
```

## Pull Requests

- Kleine, reviewbare PRs
- Tests und Docs mitliefern
- Conventional-Commit-Titel
