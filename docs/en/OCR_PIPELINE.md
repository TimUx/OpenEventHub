# OCR Pipeline

> Language: English · [Deutsch (primary)](../OCR_PIPELINE.md)

Supported formats:

- PDF
- PNG
- JPG
- JPEG
- WEBP
- TIFF

Steps

1. File validation
2. OCR text extraction
3. Language detection
4. LLM interpretation
5. Event field extraction
6. Structured JSON output

In the running system (M5+): steps 1–3 are handled by `ocr-service` (Tesseract).
Steps 4–6 are handled by `ai-service` after OCR enqueues an `ai` job with the
extracted text. Image-only PDF rasterization (poppler) is a follow-up.

**Social / flyer sources:** When event data lives primarily in images (flyers), OCR
is **mandatory** — see ADR
[`architecture/adr/0007-social-flyer-first-ocr-required.md`](../../architecture/adr/0007-social-flyer-first-ocr-required.md).
No Meta/Instagram OAuth in v1; public URLs remain plugin sources.

Output fields:

- title
- description
- start date
- end date
- location
- organizer
- website
- email
- phone
- admission
