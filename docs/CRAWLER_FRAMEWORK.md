# Crawler Framework

> Sprache: Deutsch (primär) · [English](en/CRAWLER_FRAMEWORK.md)

## Ziele

- Neue Veranstaltungen automatisch entdecken
- Dauerhaft über geplante Jobs laufen
- Tausende Quellen unterstützen
- Plugin-basierte Architektur
- Fehlertolerant
- Horizontal skalierbar

## Pipeline

```mermaid
flowchart LR
    Scheduler-->CrawlQueue
    CrawlQueue-->Crawler
    Crawler-->Plugin
    Plugin-->ObjectStorage
    Crawler-->OcrQueue
    Crawler-->AiQueue
    OcrQueue-->OcrService
    OcrService-->AiQueue
    AiQueue-->AiService
```

## Runtime (M5)

| Component | Role |
|-----------|------|
| `scheduler` | Lädt `Source.scheduleCron` und registriert wiederholbare BullMQ-Jobs auf `crawl` |
| `crawler` | Konsumiert `crawl`, führt den Plugin-Lebenszyklus aus, speichert Raw-Payloads, überspringt unveränderte Hashes |
| `ocr-service` | Konsumiert `ocr` für Bild-/PDF-markierte Payloads, schreibt `.ocr.txt`, enqueued `ai` |
| `ai-service` | Konsumiert `ai` (Event Intelligence Engine) |
| `plugins/*` | Unabhängig deploybare Connectoren (`html`, `rss`, `ics`) über das Plugin SDK |

Neue Quelltypen werden als Plugins unter `plugins/` mit einem `plugin.json`-Manifest hinzugefügt.
Core-Services entdecken sie beim Start (`PLUGINS_DIR`); Änderungen am Core-Code sind nicht erforderlich.

## Änderungserkennung

Wenn ein Crawl denselben `contentHash` wie ein vorheriges erfolgreiches Ergebnis
für dieselbe Quelle liefert, wird der Job als `skipped` markiert und nachgelagerte
OCR-/AI-Jobs werden nicht enqueued.
