# Event Intelligence Engine (EIE)

> Sprache: Deutsch (primär) · [English](en/EVENT_INTELLIGENCE_ENGINE.md)

## Zweck

Die Event Intelligence Engine ist die Kernkomponente von OpenEventHub.

Verantwortlichkeiten:
- Veranstaltungen erkennen
- Strukturierte Informationen extrahieren
- Informationen aus mehreren Quellen zusammenführen
- Confidence Score berechnen
- Duplikate erkennen
- Kategorien zuweisen
- Regionen erkennen
- Organisatoren erkennen
- Venues erkennen
- Durchsuchbare Metadaten erzeugen

## Verarbeitungspipeline

```mermaid
flowchart LR
    A[Source] --> B[Parser]
    B --> C[OCR if required]
    C --> D[LLM Extraction]
    D --> E[Normalization]
    E --> F[Duplicate Detection]
    F --> G[Classification]
    G --> H[Geocoding]
    H --> I[Confidence Score]
    I --> J[Database]
```

## Persistenz nach Crawl-Ingest

Crawl-Jobs erzeugen zunächst `CrawlResult` (+ Object Storage) und stellen Rohinhalt
in die `ai`-Queue. Die EIE:

1. bereitet den Inhalt für das LLM auf (HTML → Klartext, Längenbegrenzung),
2. extrahiert und klassifiziert,
3. legt bei `isEvent` + Titel + `startAt` und fehlendem `eventId` ein neues `Event`
   mit Status `pending_moderation` an (inkl. `EventVersion` und optional `EventSource`
   über `sourceId`),
4. speichert `AIAnalysis`,
5. löst Klassifikations-Labels per **Find-or-create** auf und verknüpft Kategorien,
   Tags, Regionen und optional Venue.

Listen mit mehreren Terminen:

- Das **HTML-Plugin** (`1.3.0+`) erkennt Termine markup-unabhängig (Tabelle, Liste,
  Div/Divi, JSON-LD, `<time>`, Klartext-Datumszeilen) und eingebettete EMS-Widgets
  (Toubiz → API, **alle zukünftigen** Termine inkl. Pagination/`dateIntervals`).
- Der Crawler enqueued dann **einen AI-Job pro Kandidat** (strukturierter Kurztext),
  statt die komplette HTML-Seite einmalig an das LLM zu senden.
- Dediziertes Plugin `toubiz` für Quellen, die direkt als EMS angebunden werden.
- Fallback ohne Plugin-Treffer: Extraction-Prompt (`event-extraction` **1.0.1**)
  liefert weiterhin **ein** primäres Event pro Job (frühester datierter Eintrag).
- Strukturierte Plugin-Kandidaten werden auch dann persistiert, wenn das LLM
  `isEvent=false` setzt (Guard im AI-Service).

Ohne `eventId` und ohne creatable Extraction wird das AI-Ergebnis nicht persistiert
(Warnung im Log).
