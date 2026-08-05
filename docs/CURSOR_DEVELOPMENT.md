# Cursor-Entwicklungsleitfaden

> Sprache: Deutsch (primär) · [English](en/CURSOR_DEVELOPMENT.md)

Wie Agents und Contributors Cursor mit OpenEventHub nutzen (Paket 10).

## Verbindlicher Kontext

Projektregeln liegen in `.cursor/rules/`:

| Regel | Scope |
|-------|-------|
| `openeventhub-core.mdc` | Always — Produkt, Architektur, Milestone-Disziplin |
| `quality-gates.mdc` | Always — CI-/lokale Gates |
| `typescript-standards.mdc` | `*.ts` / `*.tsx` |
| `docker-conventions.mdc` | `docker/**` |
| `plugins.mdc` | `plugins/**` |
| `prisma-database.mdc` | `packages/database/**` |
| `nestjs-services.mdc` | Backend-Services |
| `nextjs-ui.mdc` | Frontend + Admin |
| `prompts.mdc` | `prompts/**` |
| `documentation.mdc` | `docs/**`, `architecture/**` |
| `testing.mdc` | Tests und Fixtures |

Root-`AGENTS.md` fasst dieselben Erwartungen für jeden Coding-Agent zusammen.

## Workflow für Agents

1. Aktiven Milestone in `docs/ROADMAP.md` lesen — **einen** gleichzeitig umsetzen
2. Verbindliche Docs zum Bereich vor dem Coding lesen
3. Bestehenden Code inspizieren; Ansatz vorschlagen; dann implementieren
4. Quality Gates ausführen; Docs + CHANGELOG + Review-Note bei Milestone-Abschluss aktualisieren

## Docs gewinnen

Wenn Implementierungs-Shortcuts mit `docs/` kollidieren, den Code reparieren — Docs nie verwässern.
