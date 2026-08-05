# Crawler

Plugin-first crawl worker for OpenEventHub.

## Responsibilities

- Consume BullMQ `crawl` jobs
- Auto-register plugins from `PLUGINS_DIR` (`plugin.json` + `createPlugin()`)
- Persist raw fetch payloads to object storage
- Skip unchanged content (`contentHash`)
- Enqueue `ocr` or `ai` downstream jobs

## Probes

- `/health`, `/ready`, `/metrics`

## Configuration

| Variable                          | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `REDIS_*`                         | BullMQ connection                                 |
| `DATABASE_URL` / `POSTGRES_*`     | Source and crawl persistence                      |
| `S3_*` / `OBJECT_STORAGE_ADAPTER` | Raw payload storage                               |
| `PLUGINS_DIR`                     | Plugin root (default `/app/plugins` in container) |
