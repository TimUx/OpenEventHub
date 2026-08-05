/**
 * BullMQ OCR job payload and result contracts.
 * See docs/OCR_PIPELINE.md and docs/QUEUE_AND_WORKERS.md.
 */

export interface OcrJobPayload {
  /** Object storage key of the raw crawl payload to OCR. */
  readonly objectKey: string;
  readonly mimeType: string;
  readonly crawlResultId?: string;
  readonly sourceUrl?: string;
  readonly crawlJobId?: string;
}

export interface OcrJobResult {
  readonly text: string;
  readonly language: string | null;
  readonly mimeType: string;
  readonly objectKey: string;
  readonly crawlResultId?: string;
}
