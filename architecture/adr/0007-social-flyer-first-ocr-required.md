# ADR 0007: Social / Flyer-first — OCR Required

- Status: Accepted
- Date: 2026-08-08
- Related: `docs/OCR_PIPELINE.md`, `docs/REGIONS_AND_CATEGORIES.md` (coverage scope), Plugin First (`docs/PLUGIN_SDK.md`)

## Context

Regional event discovery (e.g. Instagram `@kirmeskalender`) often publishes
**dates and places only inside flyer images**, not as structured HTML or rich
captions. Comments may add corrections; captions stay short.

Probe of a public Instagram profile (2026-08-08):

- Profile and post grid are reachable without login (HTTP 200).
- Cookie / login walls appear; plain HTTP clients get little structured event text.
- CDN image URLs are session-sensitive (often 403 without browser context).
- Post detail shows flyer graphics (e.g. annual overview tables) plus short captions
  and crowd-sourced comment dates.

A text-only HTML crawl therefore **cannot** meet product quality for social/flyer
sources. Meta Graph API / OAuth would be more stable but was explicitly deferred
as too complex for the current product stance (public URL sources only).

## Decision

1. **Flyer-first ingest path is OCR-mandatory**  
   When a source yields images (or image-only posts) as the primary event carrier,
   the pipeline **must** store media in object storage and enqueue `ocr` → `ai`
   (existing `ocr-service` + EIE). Skipping OCR for those assets is not allowed.

2. **No Meta/Instagram account product in v1**  
   Do **not** build Facebook/Instagram OAuth, Page tokens, or end-user social login
   for ingest. Social accounts remain optional **public URL** sources (Plugin First),
   same class as HTML — not an auth product.

3. **Future Instagram (or similar) plugins**  
   Must: browser/Playwright (or equivalent) fetch of public pages → download flyer
   images → OCR → AI extraction → coverage-scope filter → consolidate.  
   Must not: rely on caption/HTML text alone for completeness.  
   Out of scope for this ADR: implementing that plugin.

4. **Multi-signal consolidation**  
   Caption, OCR text from flyers, and (later) useful comment signals may enrich one
   logical event; thinner text must not overwrite richer OCR-derived fields
   (same coalesce policy as cross-source merge).

5. **Coverage scope still applies**  
   Events resolved outside the operator Abdeckungsgebiet are dropped at AI ingest
   regardless of source type (including social/flyer).

## Consequences

### Positive

- Aligns product reality (flyer calendars) with the existing OCR → AI architecture
- Keeps Plugin First; no Meta App Review / token lifecycle in the critical path
- Clear acceptance criterion for any social plugin: OCR path wired before “done”

### Negative

- Public social scrapes remain fragile (login walls, layout/CDN changes, ToS risk)
- OCR quality on dense/graphic flyers varies; moderation stays necessary
- Comment mining and multi-image carousels need follow-up design when a plugin lands

## Alternatives considered

| Alternative                                | Why rejected                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Caption/HTML-only social crawl             | Misses most dates/places on flyer-heavy accounts                                   |
| Meta Graph API + Page tokens               | Correct long-term option, but OAuth/token refresh/App Review — deferred by product |
| Multimodal LLM on images without OCR queue | Bypasses `ocr-service` / storage contract; harder to audit and cost-control        |
| Manual-only flyer upload                   | Valid supplement, not a substitute for automated discovery sources                 |
