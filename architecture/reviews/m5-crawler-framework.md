# Milestone 5 Review — Crawler Framework

Date: 2026-08-05
Version: 0.5.0
Status: Accepted for completion; next is M6 Public API

## Architecture review

- Plugin-first connectors under `plugins/` with `@openeventhub/plugin-sdk` contracts
- Scheduler → BullMQ `crawl` → crawler plugin lifecycle → object storage
- Unchanged payloads skipped via `contentHash` (no OCR/AI reprocessing)
- Image/PDF mime types enqueue `ocr`; text payloads enqueue `ai`
- OCR writes `.ocr.txt` beside the raw object and forwards text to `ai`
- Object storage adapters: filesystem (tests) and S3/SeaweedFS (Compose)

## Code review

- Hexagonal ports: `ObjectStorageClient`, `OcrEngine`, downstream job publishers
- Fake OCR engine used only at the port boundary in tests
- Nest parameter-decorator DI avoided in processing services for tsx testability
- Queue names remain centralized in `@openeventhub/shared` (`QUEUE_NAMES`)

## Verification

| Check | Result |
|-------|--------|
| Crawler fixture + skip tests | pass (tsx) |
| OCR processing tests (fake engine) | pass (tsx) |
| Compose file structure for crawler/ocr/scheduler | updated |

## Follow-ups (M6+)

- Public API to manage sources / trigger crawls
- PDF rasterization (poppler) for image-only PDFs
- Discovery queue fan-out beyond single source URL
- Geocoding / search-index / notification consumers
