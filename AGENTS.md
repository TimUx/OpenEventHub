# AGENTS.md

Kurzbriefing für Agenten. Vollständige Regeln: `.cursor/rules/` und `docs/CURSOR_DEVELOPMENT.md`.
English docs: [`docs/en/`](docs/en/).

## Nicht verhandelbar

- `docs/` (Deutsch) ist verbindlich; Code an Docs anpassen — nicht umgekehrt
- Ein Milestone nach dem anderen (`docs/ROADMAP.md`)
- Container First — Plattform läuft in Docker Compose / Stack
- Neue Quellen = nur Plugins (`docs/PLUGIN_SDK.md`)
- Prompts nur unter `prompts/`
- Conventional Commits + SemVer (`docs/RELEASE.md`)
- Dokumentation primär auf Deutsch; Englisch unter `docs/en/`

## Stack

NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Next.js, SeaweedFS (S3), Traefik.

## Quality Gates

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
```

CI: `.github/workflows/ci.yml` · Release: `.github/workflows/release.yml`
