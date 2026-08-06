# Klassifikation

> Sprache: Deutsch (primär) · [English](en/CLASSIFICATION.md)

Die KI weist Events Taxonomie-Labels zu:

- Category
- Subcategory
- Tags
- Region
- Municipality
- District

Mehrere Kategorien sind erlaubt.

Nach der Klassifikation löst der AI-Service die Labels gegen den Katalog auf (**Find-or-create**) und verknüpft:

- `EventCategory` / `EventTag`
- `Region`-Hierarchie (State → Municipality → District)
- optional `Venue` inkl. `regionId` (für Karten-/Regionsfilter)

Bestehende Einträge werden namensgleich (case-insensitive) wiederverwendet. Details: `REGIONS_AND_CATEGORIES.md`.
