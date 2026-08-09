# Queue & Workers

> Language: English · [Deutsch (primary)](../QUEUE_AND_WORKERS.md)

Redis + BullMQ

Queues:
- Discovery
- Crawl
- OCR
- AI
- Geocoding — worker (`services/worker`), Nominatim → venue/region coordinates
- Search Index
- Notifications

Workers are stateless and horizontally scalable.

## Crawl queue

- One repeatable job (schedule tick) per distinct cron pattern, not one job per source
- Sources that share a schedule are processed **serially** within the tick
- Crawl worker: `concurrency: 1` (serializes crawl jobs within one instance)
