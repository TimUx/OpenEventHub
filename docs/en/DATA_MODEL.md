# OpenEventHub Data Model

> Language: English · [Deutsch (primary)](../DATA_MODEL.md)

## Core Principles

- One logical event can have many sources.
- Source data is immutable where possible.
- AI produces normalized event records.
- Every important change is versioned.

## Main Entities

- Event
- EventVersion
- EventSource
- Source
- CrawlJob
- CrawlResult
- Organizer
- Venue
- Region
- Category
- Tag
- Media
- AIAnalysis
- ModerationItem
- UserSubmission

## Entity Relationship

```mermaid
erDiagram
    EVENT ||--o{ EVENT_VERSION : has
    EVENT ||--o{ EVENT_SOURCE : references
    EVENT }o--|| VENUE : occurs_at
    EVENT }o--|| ORGANIZER : organized_by
    EVENT }o--o{ CATEGORY : classified_as
    EVENT }o--o{ TAG : tagged
    EVENT ||--o{ MEDIA : contains
    EVENT_SOURCE }o--|| SOURCE : originates_from
    SOURCE ||--o{ CRAWL_JOB : schedules
    CRAWL_JOB ||--o{ CRAWL_RESULT : produces
    EVENT ||--o{ AI_ANALYSIS : analyzed_by
```

## Event Lifecycle

Discovery → AI Extraction → Deduplication → Moderation (optional) → Publish → Versioning
