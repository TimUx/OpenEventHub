import type { OcrEngine, OcrEngineRequest, OcrEngineResult } from '../ports/ocr.engine.js';

/**
 * Port-boundary fake for tests. Not a business mock — returns canned OCR text.
 */
export class FakeOcrEngine implements OcrEngine {
  constructor(private readonly text: string, private readonly language: string | null = 'eng') {}

  extractText(_request: OcrEngineRequest): Promise<OcrEngineResult> {
    return Promise.resolve({
      text: this.text,
      language: this.language,
    });
  }
}
