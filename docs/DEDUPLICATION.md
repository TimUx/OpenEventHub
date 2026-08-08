# Duplikaterkennung

> Sprache: Deutsch (primär) · [English](en/DEDUPLICATION.md)

Mehrere Quellen beschreiben oft **dieselbe** Veranstaltung. OpenEventHub verknüpft sie
zu **einem** logischen Event (`Event` ← viele `EventSource`) und vervollständigt fehlende
Felder, statt Duplikate anzulegen.

## Signale (v1, deterministisch im AI-Ingest)

Aktuell ausgewertet beim Persistieren (`services/ai-service`, Domain `event-consolidate`):

| Signal | Regel |
|--------|--------|
| Titel | Normalisiert (Case/Umlaute/Satzzeichen/Jahr); optional Hauptteil vor Gedankenstrich; leichte Suffix-Drift erlaubt |
| Datum | Gleicher **UTC-Kalendertag** von `startAt` |
| Venue/Ort | Verstärkt den Treffer; **konfliktierende** konkrete Orte blockieren den Merge |

Weitere in der Roadmap / späteren Stufen (noch nicht automatisiert):

- Gleicher Organisator
- Ähnliche Beschreibung / Flyer / Image-Hash
- LLM-Tie-Break bei Mehrdeutigkeit

## Entscheidung

1. **Gleicher Source + gleicher `externalId`** (`Titel|startAtISO`) → bestehendes Event aktualisieren (Feld-Konsolidierung).
2. **Anderer Source, Match nach Titel+Tag (+ Venue-Kompatibilität)** → `EventSource` verknüpfen und fehlende Felder auffüllen (`changeReason`: `ai.consolidate`).
3. **Kein Match** → neues Event (`pending_moderation`, `ai.ingest`).

Status-Filter für Matches: `draft`, `pending_moderation`, `published` (nicht `rejected` / `archived`).

## Feld-Konsolidierung

Beim Zusammenführen gilt **nur auffüllen / anreichern**, nicht verarmen:

- Leere `summary` / `description` werden aus der neuen Quelle gefüllt
- Vorhandener Text wird nur ersetzt, wenn die neue Quelle **länger/reicher** ist
- `endAt` wird gesetzt, wenn bisher fehlend
- `confidenceScore` nimmt das Maximum; bei mehreren Quellen greift der Multi-Source-Bonus im Confidence-Score

Taxonomie (Kategorien, Regionen, Venue) wird weiterhin per Find-or-create nachgezogen und kann fehlende Orte ergänzen.
