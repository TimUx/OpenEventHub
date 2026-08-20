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
3. **duplicate detection / consolidation**: when `isEvent` + title + `startAt` are
   present (and **not expired**: effective end `endAt` or `startAt` ≥ now) — same
   source `externalId` or cross-source match (title + UTC day, venue-compatible) →
   enrich the existing event and link `EventSource`; otherwise create a new event
   with status `pending_moderation` (plus `EventVersion`),
4. stores `AIAnalysis` (confidence accounts for source count),
5. resolves classification labels and links categories
   (catalog match / aliases only — no auto-creation of new categories),
   tags and places (find-or-create),
   regions, and optionally a venue.

Multi-event listing pages:

- The **HTML plugin** (`1.3.0+`) detects events markup-agnostically (table, list,
  div/Divi, JSON-LD, `<time>`, plain date lines) and embedded EMS widgets
  (Toubiz → API, **all future** dates including pagination/`dateIntervals`).
- The crawler then enqueues **one AI job per candidate** (structured short text)
  instead of sending the full HTML page once to the LLM.
- Dedicated `toubiz` plugin (`1.1.0+`) for sources wired directly as EMS:
  occurrences via `eventDates` (including address), description/category via event detail;
  `sourceCategories` (e.g. `Tanzkurs`) map onto the catalog and are not overwritten by
  LLM guesses such as Kirmes.
- Fallback with no plugin hits: extraction prompt `event-extraction` **1.0.2**
  still returns **one** primary event per job (earliest dated entry).
- Structured plugin candidates are persisted even if the LLM sets `isEvent=false`
  (guard in the AI service).
- When no venue is given but the **title** embeds a place (e.g. `Kirmes Niedergrenzebach`,
  `Scherzmarkt in Treysa`), prompts and deterministic post-processing set
  `venueName` / `municipality` (shared helper `inferPlaceFromTitle`).
- Everywhere: **only non-expired** events (plugins, crawler filter, AI ingest).
- Without a clock time in the source: events are stored as **all-day** (`allDay`);
  UI and ICS must not invent times (no `01:00`/`02:00` from UTC midnight).

Without `eventId` and without a creatable extraction, the AI result is not persisted
(warning in logs).
