# Contributing to OpenEventHub

Thank you for contributing. OpenEventHub is documentation-driven:
**`docs/` always wins** over informal implementation shortcuts.

Full local workflows: [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md).
Cursor / agent rules: [`docs/CURSOR_DEVELOPMENT.md`](docs/CURSOR_DEVELOPMENT.md), [`AGENTS.md`](AGENTS.md).
Release / changelog rules: [`docs/RELEASE.md`](docs/RELEASE.md).
CI: [`docs/CI_CD.md`](docs/CI_CD.md).

## Principles

- Container First — develop and run via Docker Compose / Stack
- One milestone at a time (`docs/ROADMAP.md`)
- Plugin First for new sources (`docs/PLUGIN_DEVELOPMENT.md`)
- Prompts only in `prompts/`
- Conventional Commits + SemVer

## Development setup

```bash
cp .env.example .env
npm run infra:bootstrap
npm run db:migrate && npm run db:seed
npm run stack:up
```

URLs and env keys: `docs/DEVELOPER_GUIDE.md`, `docs/DOCKER_COMPOSE.md`.

## Quality gates

Prefer containerized tooling (no host Node dependency):

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
npm run validate:stack
```

Or with a local Node 20+ install:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run verify:plugins
npm run validate:compose
```

## Pull requests

1. Branch from `main` or `develop` (`feature/*`, `bugfix/*`, `hotfix/*`) — see `docs/GITHUB_WORKFLOW.md`
2. Keep PRs scoped to a single milestone concern
3. Update docs when behavior or architecture changes
4. Include tests for new behavior
5. Ensure quality gates are green
6. For milestone completion: update `CHANGELOG.md` per `docs/RELEASE.md`

## Architecture decisions

Non-trivial decisions need an ADR under `architecture/adr/` using `docs/ADR_GUIDE.md`.
