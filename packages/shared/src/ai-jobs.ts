/**
 * BullMQ AI job payload and result contracts.
 * See docs/EVENT_INTELLIGENCE_ENGINE.md and docs/QUEUE_AND_WORKERS.md.
 */

export interface ExtractedEventFields {
  readonly isEvent: boolean;
  readonly title: string | null;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  /** True when the source provided a calendar date but no clock time. */
  readonly allDay?: boolean;
  readonly organizerName: string | null;
  readonly venueName: string | null;
  readonly venueAddress: string | null;
  readonly isRecurring: boolean;
  readonly extractionConfidence: number;
  /** Absolute or relative image URLs from the source (og:image, JSON-LD, etc.). */
  readonly images?: readonly string[];
  /** Source taxonomy labels (e.g. Toubiz `category.name`); never invented by the LLM. */
  readonly sourceCategories?: readonly string[];
}

export interface AiJobPayload {
  readonly content: string;
  readonly sourceUrl?: string;
  readonly crawlResultId?: string;
  readonly eventId?: string;
  readonly jobId?: string;
  /** Source that produced the crawl; required to create EventSource links on ingest. */
  readonly sourceId?: string;
  /** Structured plugin candidate; wins over LLM gaps for title/description/venue. */
  readonly pluginEvent?: ExtractedEventFields;
}

export interface ClassificationFields {
  readonly categories: readonly string[];
  readonly subcategories: readonly string[];
  readonly tags: readonly string[];
  readonly region: string | null;
  /** Landkreis / county */
  readonly district: string | null;
  /** Kommune (Gemeinde oder Stadt als Verwaltungseinheit) */
  readonly municipality: string | null;
  /** Ort / Dorf / Ortsteil under the Kommune */
  readonly place: string | null;
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
