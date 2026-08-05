import { normalizeMimeType } from '../mime.js';
import type { OcrEngine, OcrEngineRequest, OcrEngineResult } from '../ports/ocr.engine.js';

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/tiff',
  'image/tif',
]);

/**
 * Tesseract.js adapter for image OCR.
 * PDF is validated upstream; image-only PDFs are out of scope for the WASM worker in M5
 * and are rejected with a clear error so a later poppler stage can be added.
 */
export class TesseractJsOcrEngine implements OcrEngine {
  async extractText(request: OcrEngineRequest): Promise<OcrEngineResult> {
    const mime = normalizeMimeType(request.mimeType);
    if (mime === 'application/pdf') {
      throw new Error(
        'PDF OCR requires rasterization (poppler); use image sources or text PDF extraction in a later milestone',
      );
    }
    if (!SUPPORTED_IMAGE_TYPES.has(mime)) {
      throw new Error(`Unsupported OCR mime type: ${mime}`);
    }

    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng+deu');
    try {
      const result = await worker.recognize(request.bytes);
      const text = result.data.text.trim();
      return {
        text,
        language: 'eng+deu',
      };
    } finally {
      await worker.terminate();
    }
  }
}
