export interface OcrEngineRequest {
  readonly bytes: Buffer;
  readonly mimeType: string;
}

export interface OcrEngineResult {
  readonly text: string;
  readonly language: string | null;
}

export interface OcrEngine {
  extractText(request: OcrEngineRequest): Promise<OcrEngineResult>;
}

export const OCR_ENGINE = Symbol('OCR_ENGINE');
