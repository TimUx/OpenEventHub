import type { ExtractedEventFields } from '@openeventhub/shared';

/**
 * Deterministic confidence score (0..1) from docs/CONFIDENCE_SCORE.md weights.
 * AI Agreement uses extractionConfidence from the LLM when present.
 */
export function calculateConfidenceScore(
  extraction: ExtractedEventFields,
  options: { readonly sourceCount?: number; readonly hasImages?: boolean } = {},
): number {
  const sourceCount = options.sourceCount ?? 1;
  const hasImages = options.hasImages ?? false;

  let score = 0;

  if (extraction.startAt) {
    score += 20;
  }
  if (extraction.venueName) {
    score += 15;
  }
  if (extraction.organizerName) {
    score += 10;
  }
  if (extraction.venueAddress) {
    score += 10;
  }
  if (hasImages) {
    score += 10;
  }
  if (sourceCount > 1) {
    score += 15;
  }

  const agreement = clamp01(extraction.extractionConfidence);
  score += agreement * 20;

  return clamp01(score / 100);
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
