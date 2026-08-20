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
- Fehlen klare Labels: Alias-Inferenz aus Titel/Summary/Beschreibung; bei 0 oder mehreren Treffern → Katalog-Kategorie **Sonstiges** (`slug: sonstiges`)
- Admin kann Kategorien jederzeit manuell überschreiben
- `EventTag` — Find-or-create
- `Region` — Katalog-Match oder Nominatim-verifizierte Siedlungskette (Land → Bundesland → Landkreis → Kommune → Ort); keine Blind-Anlage aus Venue-/POI-Labels
- optional `Venue` including `regionId` (for map/region filters)

Bestehende Regionen werden namensgleich (case-insensitive) wiederverwendet. Details: `REGIONS_AND_CATEGORIES.md`.

Feldbedeutung:

- `region` → Bundesland (`state`)
- `district` → Landkreis (`district`)
- `municipality` → Kommune (`municipality`) — nur echte Verwaltungseinheit
- `place` → Ort (`suburb`) — nur Dorf/Stadtteil/Ortsteil, nie Venue/Gebäude/Adresse

Klassifikations-Prompt: `event-classification` **1.0.6**.
