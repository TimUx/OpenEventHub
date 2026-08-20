# Duplicate Detection

> Language: English · [Deutsch (primary)](../DEDUPLICATION.md)

Multiple sources often describe the **same** event. OpenEventHub links them to **one**
logical event (`Event` ← many `EventSource`) and fills missing fields instead of creating
duplicates.

## Signals (v1, deterministic in AI ingest)

Evaluated on persist (`services/ai-service`, domain `event-consolidate`):

| Signal | Rule |
|--------|------|
| Title | Normalized (case/umlauts/punctuation/year); optional clause before dash; mild suffix drift allowed |
| Date | Same **UTC calendar day** of `startAt` |
| Venue/place | Reinforces a match; **conflicting** concrete places block the merge |

Later stages (not automated yet):

- Same organizer
- Similar description / flyer / image hash
- LLM tie-break when ambiguous

## Decision

1. **Same source + same `externalId`** (`title|startAtISO`) → update existing event (field coalesce).
2. **Other source, title+day match (+ venue compatibility)** → link `EventSource` and fill missing fields (`changeReason`: `ai.consolidate`).
3. **No match** → create event (`pending_moderation`, `ai.ingest`).

Matchable statuses: `draft`, `pending_moderation`, `published` (not `rejected` / `archived`).

## Field consolidation

Merge **fills / enriches** only — it does not impoverish:

- Empty `summary` / `description` are filled from the new source
- Existing text is replaced only when the new source is **longer/richer**
- `endAt` is set when previously missing
- `confidenceScore` takes the maximum; multiple sources enable the multi-source confidence bonus

Taxonomy: categories are catalog-match only; regions require catalog match or Nominatim-verified settlement chain; venues still use find-or-create.
