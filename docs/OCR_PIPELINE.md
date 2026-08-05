# OCR Pipeline

> Sprache: Deutsch (primär) · [English](en/OCR_PIPELINE.md)

Unterstützte Formate:

- PDF
- PNG
- JPG
- JPEG
- WEBP
- TIFF

Schritte

1. Dateivalidierung
2. OCR-Textextraktion
3. Spracherkennung
4. LLM-Interpretation
5. Extraktion der Event-Felder
6. Strukturierte JSON-Ausgabe

Im laufenden System (M5+): Schritte 1–3 übernimmt `ocr-service` (Tesseract).
Schritte 4–6 übernimmt `ai-service`, nachdem OCR einen `ai`-Job mit dem
extrahierten Text enqueued. Rasterisierung bildbasierter PDFs (poppler) folgt später.

Ausgabefelder:

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
