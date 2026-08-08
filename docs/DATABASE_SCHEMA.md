# Datenbankschema

> Sprache: Deutsch (primär) · [English](en/DATABASE_SCHEMA.md)

Verbindliche Referenz für das PostgreSQL-Schema, umgesetzt in
`packages/database/prisma/schema.prisma`. Tabellennamen nutzen snake_case über
`@@map`; Prisma-Models nutzen PascalCase.

## Enums

| Enum | Werte |
|------|--------|
| `EventStatus` | `draft`, `pending_moderation`, `published`, `archived`, `rejected` |
| `SourceStatus` | `healthy`, `warning`, `failed`, `disabled` |
| `CrawlJobStatus` | `pending`, `queued`, `running`, `completed`, `failed`, `cancelled` |
| `CrawlResultStatus` | `success`, `failed`, `skipped`, `partial` |
| `ModerationStatus` | `pending`, `approved`, `rejected`, `escalated` |
| `SubmissionType` | `event`, `source`, `correction` |
| `SubmissionStatus` | `pending`, `processing`, `accepted`, `rejected` |
| `MediaType` | `image`, `video`, `document`, `audio`, `other` |
| `RegionType` | `country`, `state`, `district`, `municipality`, `city`, `suburb` |

## events

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | Primärschlüssel |
| slug | text | Eindeutiger öffentlicher Identifier |
| title | text | |
| summary | text | Nullable |
| description | text | Nullable |
| start_at | timestamptz | |
| end_at | timestamptz | Nullable |
| confidence_score | decimal(5,4) | Default 0 |
| status | EventStatus | Default `draft` |
| venue_id | UUID | FK → venues, nullable |
| organizer_id | UUID | FK → organizers, nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## event_versions

Append-only Snapshots gemäß `docs/VERSIONING.md`. Kein destruktives Überschreiben der Historie.

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | Primärschlüssel |
| event_id | UUID | FK → events |
| version_number | int | Eindeutig pro Event |
| title | text | Snapshot |
| start_at | timestamptz | Snapshot |
| end_at | timestamptz | Nullable Snapshot |
| venue_id | UUID | Nullable Snapshot |
| organizer_id | UUID | Nullable Snapshot |
| confidence_score | decimal(5,4) | Snapshot |
| status | EventStatus | Snapshot |
| change_reason | text | Nullable |
| changed_at | timestamptz | |

## event_sources

Ordnet eine logische Veranstaltung vielen Ursprungsquellen zu.

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | |
| event_id | UUID | FK → events |
| source_id | UUID | FK → sources |
| external_id | text | Nullable; eindeutig pro Quelle |
| source_url | text | Nullable |
| confidence_score | decimal(5,4) | Nullable |
| created_at / updated_at | timestamptz | |

## sources

Crawler-Konfiguration und Health-Metadaten.

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | |
| name | text | |
| plugin_type | text | Plugin-Identifier |
| url | text | Einstiegs-URL |
| schedule_cron | text | Nullable Cron-Ausdruck |
| config | jsonb | Plugin-spezifische Einstellungen |
| status | SourceStatus | Default `healthy` |
| last_crawl_at | timestamptz | Nullable |
| last_error | text | Nullable |
| created_at / updated_at | timestamptz | |

## crawl_jobs

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | |
| source_id | UUID | FK → sources |
| status | CrawlJobStatus | |
| scheduled_at | timestamptz | |
| started_at | timestamptz | Nullable |
| completed_at | timestamptz | Nullable |
| error_message | text | Nullable |
| created_at | timestamptz | |

## crawl_results

Referenzen auf Raw-Fetch-Ausgaben (Objektspeicher / S3) und Content-Hash zur Änderungskennung.

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | |
| crawl_job_id | UUID | FK → crawl_jobs |
| object_key | text | Object Key im S3-kompatiblen Speicher |
| content_hash | text | |
| status | CrawlResultStatus | |
| mime_type | text | Nullable |
| byte_size | int | Nullable |
| fetched_at | timestamptz | |
| created_at | timestamptz | |

## organizers / venues

Standard-Entity-Tabellen mit Slug sowie Kontakt-/Standortfeldern. Venues können optional
über `region_id` mit `regions` verknüpft werden.

## regions

Hierarchische Geografie (`parent_id` Selbstreferenz). Typen folgen
`docs/REGIONS_AND_CATEGORIES.md`.

## coverage_scope_regions

Operator-gewählte Wurzeln des **Abdeckungsgebiets** (`region_id` PK/FK → `regions`,
Cascade-Delete). Leer = kein Geo-Filter beim AI-Ingest. Ein gewählter Landkreis
schließt Nachfahren (Gemeinden) ein, ohne sie einzeln zu speichern.

## categories / tags

Kategorien sind hierarchisch (`parent_id`). Tags sind flach. Events verknüpfen über
Join-Tabellen `event_categories` und `event_tags` (Many-to-Many).

## media

An Events angehängte Assets mit `MediaType`, optionaler URL oder Objektspeicher-Key, Sortierreihenfolge.

## ai_analyses

| Spalte | Typ | Hinweise |
|--------|------|-------|
| id | UUID | |
| event_id | UUID | FK → events |
| crawl_result_id | UUID | Nullable FK → crawl_results |
| prompt_id | text | Aus dem Katalog `prompts/` |
| prompt_version | text | |
| model | text | |
| provider | text | |
| extracted_fields | jsonb | Strukturierte LLM-Ausgabe |
| confidence | decimal(5,4) | |
| created_at | timestamptz | |

## moderation_items / user_submissions

Moderations-Workflow-Entitäten gemäß `docs/MODERATION.md`. Submissions tragen
`SubmissionType`, JSON-Payload und Verarbeitungsstatus.

## Migrationen und Seed

```bash
cp .env.example .env
npm run db:migrate          # or: bash scripts/db-migrate.sh
npm run db:seed             # or: bash scripts/db-seed.sh
```

Seed-Daten: Germany → Bayern → München; Music/Sports/Culture mit beispielhaften
Unterkategorien.
