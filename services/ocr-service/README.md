# OCR Service

Tesseract-based OCR worker for crawled images (and PDF validation gate).

## Responsibilities

- Consume BullMQ `ocr` jobs
- Validate mime types from `docs/OCR_PIPELINE.md`
- Extract text via Tesseract.js
- Store OCR text object (`*.ocr.txt`)
- Enqueue BullMQ `ai` jobs with extracted text

## Probes

- `/health`, `/ready`, `/metrics`

## Configuration

| Variable                          | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| `REDIS_*`                         | BullMQ connection                       |
| `S3_*` / `OBJECT_STORAGE_ADAPTER` | Read raw crawl objects / write OCR text |
