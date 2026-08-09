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
- `EventTag` / places — find-or-create
- `Region` hierarchy Land → Bundesland → Landkreis → Kommune → Ort
- optional `Venue` including `regionId` (for map/region filters)

Existing entries are reused by name (case-insensitive). See `REGIONS_AND_CATEGORIES.md`.

Field meaning:

- `region` → federal state (`state`)
- `district` → Landkreis (`district`)
- `municipality` → Kommune (`municipality`)
- `place` → Ort (`suburb`)
