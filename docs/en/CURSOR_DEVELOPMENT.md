# Cursor Development Guide

> Language: English · [Deutsch (primary)](../CURSOR_DEVELOPMENT.md)

How agents and contributors use Cursor with OpenEventHub (Package 10).

## Binding context

Project rules live in `.cursor/rules/`:

| Rule | Scope |
|------|-------|
| `openeventhub-core.mdc` | Always — product, architecture, milestone discipline |
| `quality-gates.mdc` | Always — CI/local gates |
| `typescript-standards.mdc` | `*.ts` / `*.tsx` |
| `docker-conventions.mdc` | `docker/**` |
| `plugins.mdc` | `plugins/**` |
| `prisma-database.mdc` | `packages/database/**` |
| `nestjs-services.mdc` | Backend services |
| `nextjs-ui.mdc` | Frontend + Admin |
| `prompts.mdc` | `prompts/**` |
| `documentation.mdc` | `docs/**`, `architecture/**` |
| `testing.mdc` | Tests and fixtures |

Root `AGENTS.md` summarizes the same expectations for any coding agent.

## Workflow for agents

1. Read the active milestone in `docs/ROADMAP.md` — implement **one** at a time
2. Read binding docs for the area before coding
3. Inspect existing code; propose approach; then implement
4. Run quality gates; update docs + CHANGELOG + review note on milestone completion

## Docs win

If implementation shortcuts conflict with `docs/`, fix the code — never dilute the docs.
