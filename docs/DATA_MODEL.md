# OpenEventHub-Datenmodell

> Sprache: Deutsch (primär) · [English](en/DATA_MODEL.md)

## Kernprinzipien

- Eine logische Veranstaltung kann viele Quellen haben.
- Quelldaten sind möglichst unveränderlich.
- Die KI erzeugt normalisierte Event-Datensätze.
- Jede wichtige Änderung wird versioniert.

## Hauptentitäten

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

## Entity-Relationship

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

## Event-Lebenszyklus

Discovery → AI Extraction → Deduplication → Moderation (optional) → Publish → Versioning
