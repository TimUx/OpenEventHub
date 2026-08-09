# Queue & Workers

> Sprache: Deutsch (primär) · [English](en/QUEUE_AND_WORKERS.md)

Redis + BullMQ

Queues:
- Discovery
- Crawl
- OCR
- AI
- Geocoding — Worker (`services/worker`), Nominatim → Venue-/Region-Koordinaten
- Search Index
- Notifications

Worker sind zustandslos und horizontal skalierbar.

## Crawl-Queue

- Pro Cron-Muster ein Repeatable-Job (Schedule-Tick), nicht ein Job pro Quelle
- Quellen mit gleichem Schedule werden im Tick **seriell** abgearbeitet
- Crawl-Worker: `concurrency: 1` (globale Serialisierung der Crawl-Jobs in einer Instanz)
