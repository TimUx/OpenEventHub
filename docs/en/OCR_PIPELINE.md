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
