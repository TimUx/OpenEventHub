
# Database Schema

Binding reference for the PostgreSQL schema implemented in
`packages/database/prisma/schema.prisma`. Table names use snake_case via
`@@map`; Prisma models use PascalCase.

## Enums

| Enum | Values |
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

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| slug | text | Unique public identifier |
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

Append-only snapshots per `docs/VERSIONING.md`. No destructive overwrite of history.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| event_id | UUID | FK → events |
| version_number | int | Unique per event |
| title | text | Snapshot |
| start_at | timestamptz | Snapshot |
| end_at | timestamptz | Nullable snapshot |
| venue_id | UUID | Nullable snapshot |
| organizer_id | UUID | Nullable snapshot |
| confidence_score | decimal(5,4) | Snapshot |
| status | EventStatus | Snapshot |
| change_reason | text | Nullable |
| changed_at | timestamptz | |

## event_sources

Maps one logical event to many origin sources.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| event_id | UUID | FK → events |
| source_id | UUID | FK → sources |
| external_id | text | Nullable; unique per source |
| source_url | text | Nullable |
| confidence_score | decimal(5,4) | Nullable |
| created_at / updated_at | timestamptz | |

## sources

Crawler configuration and health metadata.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| name | text | |
| plugin_type | text | Plugin identifier |
| url | text | Entry URL |
| schedule_cron | text | Nullable cron expression |
| config | jsonb | Plugin-specific settings |
| status | SourceStatus | Default `healthy` |
| last_crawl_at | timestamptz | Nullable |
| last_error | text | Nullable |
| created_at / updated_at | timestamptz | |

## crawl_jobs

| Column | Type | Notes |
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

Raw fetch output references (object storage / S3) and content hash for change detection.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| crawl_job_id | UUID | FK → crawl_jobs |
| object_key | text | Object key in S3-compatible storage |
| content_hash | text | |
| status | CrawlResultStatus | |
| mime_type | text | Nullable |
| byte_size | int | Nullable |
| fetched_at | timestamptz | |
| created_at | timestamptz | |

## organizers / venues

Standard entity tables with slug, contact/location fields. Venues optionally link
to `regions` via `region_id`.

## regions

Hierarchical geography (`parent_id` self-reference). Types follow
`docs/REGIONS_AND_CATEGORIES.md`.

## categories / tags

Categories are hierarchical (`parent_id`). Tags are flat. Events link via
`event_categories` and `event_tags` join tables (many-to-many).

## media

Event-attached assets with `MediaType`, optional URL or object storage key, sort order.

## ai_analyses

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| event_id | UUID | FK → events |
| crawl_result_id | UUID | Nullable FK → crawl_results |
| prompt_id | text | From `prompts/` catalog |
| prompt_version | text | |
| model | text | |
| provider | text | |
| extracted_fields | jsonb | Structured LLM output |
| confidence | decimal(5,4) | |
| created_at | timestamptz | |

## moderation_items / user_submissions

Moderation workflow entities per `docs/MODERATION.md`. Submissions carry
`SubmissionType`, JSON payload, and processing status.

## Migrations and seed

```bash
cp .env.example .env
npm run db:migrate          # or: bash scripts/db-migrate.sh
npm run db:seed             # or: bash scripts/db-seed.sh
```

Seed data: Germany → Bayern → München; Music/Sports/Culture with sample child
categories.
