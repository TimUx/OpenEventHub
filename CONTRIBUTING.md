# Contributing to OpenEventHub

Thank you for contributing. OpenEventHub is documentation-driven:
**`docs/` always wins** over informal implementation shortcuts.

## Principles

- Container First — develop and run via Docker Compose / Stack
- One milestone at a time (`docs/ROADMAP.md`)
- Plugin First for new sources
- Prompts only in `prompts/`
- Conventional Commits + SemVer

## Development setup (infrastructure)

```bash
cp .env.example .env
npm run infra:bootstrap
```

Application services are introduced from Milestone 2 onward.

## Quality gates

Prefer containerized tooling (no host Node dependency):

```bash
npm run tools:check
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
npm run validate:compose
```

## Pull requests

1. Branch from `develop` (`feature/*`, `bugfix/*`, `hotfix/*`)
2. Keep PRs scoped to a single milestone concern
3. Update docs when behavior or architecture changes
4. Include tests for new behavior
5. Ensure CI is green

## Architecture decisions

Non-trivial decisions need an ADR under `architecture/adr/` using `docs/ADR_GUIDE.md`.
