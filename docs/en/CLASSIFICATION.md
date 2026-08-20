# Classification

> Language: English · [Deutsch (primary)](../CLASSIFICATION.md)

The AI assigns taxonomy labels to events:

- Category / Subcategory / Tags
- Region (federal state)
- District (Landkreis)
- Municipality (Kommune)
- Place (Ort)

Multiple categories are allowed.

After classification the AI service resolves labels against the catalog and links:

- `EventCategory` — match existing categories only (curated catalog + aliases; no auto-create)
- If labels are unclear: alias inference from title/summary/description; if zero or multiple hits → curated **Sonstiges** (`slug: sonstiges`)
- Admins can always override categories manually
- `EventTag` — find-or-create
- `Region` — catalog match or Nominatim-verified settlement chain (country → state → district → Kommune → Ort); never blind-create from venue/POI labels
- optional `Venue` including `regionId` (for map/region filters)

Existing regions are reused by name (case-insensitive). See `REGIONS_AND_CATEGORIES.md`.

Field meaning:

- `region` → federal state (`state`)
- `district` → Landkreis (`district`)
- `municipality` → Kommune (`municipality`) — real admin unit only
- `place` → Ort (`suburb`) — village/locality only, never venue/building/address

Classification prompt: `event-classification` **1.0.6**.
