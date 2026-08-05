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
