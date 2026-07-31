/**
 * BullMQ AI job payload and result contracts.
 * See docs/EVENT_INTELLIGENCE_ENGINE.md and docs/QUEUE_AND_WORKERS.md.
 */

export interface AiJobPayload {
  readonly content: string;
  readonly sourceUrl?: string;
  readonly crawlResultId?: string;
  readonly eventId?: string;
  readonly jobId?: string;
}

export interface ExtractedEventFields {
  readonly isEvent: boolean;
  readonly title: string | null;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly organizerName: string | null;
  readonly venueName: string | null;
  readonly venueAddress: string | null;
  readonly isRecurring: boolean;
  readonly extractionConfidence: number;
}

export interface ClassificationFields {
  readonly categories: readonly string[];
  readonly subcategories: readonly string[];
  readonly tags: readonly string[];
  readonly region: string | null;
  readonly municipality: string | null;
  readonly district: string | null;
  readonly classificationConfidence: number;
}

export interface AiJobResult {
  readonly extraction: ExtractedEventFields;
  readonly classification: ClassificationFields;
  /** Deterministic quality score in range 0..1 */
  readonly confidenceScore: number;
  readonly prompts: {
    readonly extraction: { readonly id: string; readonly version: string };
    readonly classification: { readonly id: string; readonly version: string };
  };
  readonly model: string;
  readonly provider: string;
  readonly analysisId?: string;
}
