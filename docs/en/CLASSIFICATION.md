# Classification

> Language: English · [Deutsch (primary)](../CLASSIFICATION.md)

The AI assigns taxonomy labels to events:

- Category
- Subcategory
- Tags
- Region
- Municipality
- District

Multiple categories are allowed.

After classification the AI service resolves labels against the catalog (**find-or-create**) and links:

- `EventCategory` / `EventTag`
- `Region` hierarchy (State → District/Landkreis → Municipality)
- optional `Venue` including `regionId` (for map/region filters)

Existing entries are reused by name (case-insensitive). See `REGIONS_AND_CATEGORIES.md`.

Field meaning:

- `region` → federal state (`state`)
- `district` → county / Landkreis (`district`)
- `municipality` → municipality/city (`municipality`)
