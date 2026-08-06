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

Country
→ State
→ District
→ Municipality
→ City
→ District/Suburb

Bei Auto-Anlage aus Crawls typischerweise: `region` → State, `municipality` → Municipality, `district` → District (unter dem jeweils gefundenen/erzeugten Parent).

## Kategorien

Kategorien sind hierarchisch und konfigurierbar.
Veranstaltungen können mehreren Kategorien angehören.
Subkategorien aus der KI werden unter der ersten Hauptkategorie angelegt, sofern neu.
