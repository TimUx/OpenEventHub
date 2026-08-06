# Event Intelligence Engine (EIE)

> Language: English · [Deutsch (primary)](../EVENT_INTELLIGENCE_ENGINE.md)

## Purpose

The Event Intelligence Engine is the core component of OpenEventHub.

Responsibilities:
- Detect events
- Extract structured information
- Merge information from multiple sources
- Calculate confidence score
- Detect duplicates
- Assign categories
- Detect regions
- Detect organizers
- Detect venues
- Generate searchable metadata

## Processing Pipeline

```mermaid
flowchart LR
    A[Source] --> B[Parser]
    B --> C[OCR if required]
    C --> D[LLM Extraction]
    D --> E[Normalization]
    E --> F[Duplicate Detection]
    F --> G[Classification]
    G --> H[Geocoding]
    H --> I[Confidence Score]
    I --> J[Database]
```

## Persistence after crawl ingest

Crawl jobs first create a `CrawlResult` (+ object storage) and enqueue raw content on
the `ai` queue. The EIE then:

1. prepares content for the LLM (HTML → plain text, length cap),
2. extracts and classifies,
3. when `isEvent` + title + `startAt` are present and `eventId` is missing, creates a
   new `Event` with status `pending_moderation` (plus `EventVersion` and optional
   `EventSource` via `sourceId`),
4. stores `AIAnalysis`,
5. resolves classification labels via **find-or-create** and links categories, tags,
   regions, and optionally a venue.

Multi-event listing pages: extraction prompt `event-extraction` **1.0.1** currently
returns **one** primary event per job (earliest dated entry). Full multi-event ingest
is a later milestone.

Without `eventId` and without a creatable extraction, the AI result is not persisted
(warning in logs).
