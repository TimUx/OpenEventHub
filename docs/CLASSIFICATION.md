# Klassifikation

> Sprache: Deutsch (primär) · [English](en/CLASSIFICATION.md)

Die KI weist Events Taxonomie-Labels zu:

- Category / Subcategory / Tags
- Region (Bundesland)
- District (Landkreis)
- Municipality (Kommune)
- Place (Ort)

Mehrere Kategorien sind erlaubt.

Nach der Klassifikation löst der AI-Service die Labels gegen den Katalog auf und verknüpft:

- `EventCategory` — nur Match auf bestehende Kategorien (kuratierter Katalog + Aliases; keine Auto-Anlage)
- `EventTag` / Orte — Find-or-create
- `Region`-Hierarchie Land → Bundesland → Landkreis → Kommune → Ort
- optional `Venue` including `regionId` (for map/region filters)

Bestehende Einträge werden namensgleich (case-insensitive) wiederverwendet. Details: `REGIONS_AND_CATEGORIES.md`.

Feldbedeutung:

- `region` → Bundesland (`state`)
- `district` → Landkreis (`district`)
- `municipality` → Kommune (`municipality`)
- `place` → Ort (`suburb`)
