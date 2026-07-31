
# Service Communication

- HTTP/REST for synchronous requests
- GraphQL for client queries
- Redis/BullMQ for asynchronous jobs
- Internal Docker network only
- No direct database access except owning services where applicable

## Crawl Flow

1. Scheduler creates job
2. Worker executes crawler plugin
3. Raw content stored
4. AI extracts structured event
5. Duplicate detection
6. Persist event
7. Update search index
