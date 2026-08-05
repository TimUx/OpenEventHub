# Contributing to OpenEventHub

Thank you for contributing. OpenEventHub is documentation-driven:
**`docs/` (German primary)** always wins over informal shortcuts. English copies: [`docs/en/`](docs/en/).

[Deutsche Fassung (primär)](CONTRIBUTING.md)

Full local workflows: [`docs/en/DEVELOPER_GUIDE.md`](docs/en/DEVELOPER_GUIDE.md) · [Deutsch](docs/DEVELOPER_GUIDE.md).

## Principles

- Container First — develop and run via Docker Compose / Stack
- One milestone at a time (`docs/ROADMAP.md`)
- Plugin First for new sources
- Prompts only in `prompts/`
- Conventional Commits + SemVer

## Development setup

```bash
cp .env.example .env
npm run infra:bootstrap
npm run db:migrate && npm run db:seed
npm run stack:up
```

## Quality gates

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
npm run validate:stack
```
