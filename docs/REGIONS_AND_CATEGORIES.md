# Regionen & Kategorien

> Sprache: Deutsch (primär) · [English](en/REGIONS_AND_CATEGORIES.md)

## Pflege-Modell

| Aspekt | Verhalten |
|--------|-----------|
| Startwerte | Seed (`db:seed`) legt eine Start-Hierarchie an (z. B. Germany → Bayern → München; Music/Sports/Culture) |
| Crawls / KI | **Find-or-create:** bekannte Namen werden wiederverwendet; fehlende Kategorien, Tags und Orte werden automatisch angelegt und dem Event zugeordnet |
| Orte | Kein vollständiger Ortskatalog nötig — Gemeinden/Städte entstehen aus der Klassifikation (`municipality` / `region` / `district`) und optional über Venues |
| Betrieb | Admin Center unter **Kategorien** und **Regionen** zum Nachpflegen, Umbenennen, Hierarchie und Löschen |

Filter bleiben moderierbar: neu angelegte Einträge erscheinen in Admin und können bereinigt oder zusammengeführt werden.

## Regionen-Hierarchie

Country (Land)
→ State (Bundesland)
→ District (Landkreis / Bezirk)
→ Municipality / City (Gemeinde / Stadt)
→ Suburb (Stadtteil)

Bei Auto-Anlage aus Crawls:

| Klassifikationsfeld | RegionType | Parent |
|---------------------|------------|--------|
| `region` | `state` | — |
| `district` | `district` | State |
| `municipality` | `municipality` | District (oder State, falls kein Kreis) |

## Abdeckungsgebiet (Coverage Scope)

Unter Admin → Regionen kann ein **Abdeckungsgebiet** gesetzt werden (eine oder mehrere
Regionen als Wurzeln).

- Ein gewählter **Landkreis** gilt inkl. aller untergeordneten Gemeinden/Städte — diese
  müssen nicht einzeln angehakt werden.
- Zusätzliche Orte außerhalb (z. B. Alsfeld im Vogelsbergkreis neben Schwalm-Eder-Kreis)
  werden separat gewählt.
- **Leeres** Abdeckungsgebiet = kein Geo-Filter (wie bisher).
- Beim AI-Ingest werden neue Events mit erkanntem Ort **außerhalb** des Gebiets
  nicht angelegt. Ohne Ortshinweis bleibt die Übernahme möglich (Moderation).

## Kategorien

Kategorien sind hierarchisch und konfigurierbar.
Veranstaltungen können mehreren Kategorien angehören.
Subkategorien aus der KI werden unter der ersten Hauptkategorie angelegt, sofern neu.
