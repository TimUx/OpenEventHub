# AGENTS.md

OpenEventHub agent brief. Full rules: `.cursor/rules/` and `docs/CURSOR_DEVELOPMENT.md`.

## Non-negotiables

- `docs/` is binding; change code to match docs
- One milestone at a time (`docs/ROADMAP.md`)
- Container First — platform runs in Docker Compose / Stack
- New sources = plugins only (`docs/PLUGIN_SDK.md`)
- Prompts only under `prompts/`
- Conventional Commits + SemVer (`docs/RELEASE.md`)

## Stack

NestJS, TypeScript, Prisma, PostgreSQL, Redis, BullMQ, Next.js, SeaweedFS (S3), Traefik.

## Quality gates

```bash
npm run tools:check
npm run verify:plugins
npm run validate:compose
```

CI: `.github/workflows/ci.yml` · Release: `.github/workflows/release.yml`
