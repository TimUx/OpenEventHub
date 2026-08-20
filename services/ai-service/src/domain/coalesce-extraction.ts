import type { ExtractedEventFields } from '@openeventhub/shared';

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function pickLonger(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const a = nonEmpty(preferred);
  const b = nonEmpty(fallback);
  if (a && b) return a.length >= b.length ? a : b;
  return a ?? b;
}

/**
 * Plugin-structured fields win when present; the LLM only fills gaps.
 */
export function coalesceExtractedEventFields(
  plugin: ExtractedEventFields | undefined,
  llm: ExtractedEventFields,
): ExtractedEventFields {
  if (!plugin) {
    return llm;
  }

  const images = [
    ...new Set(
      [...(plugin.images ?? []), ...(llm.images ?? [])].map((url) => url.trim()).filter(Boolean),
    ),
  ];
  const sourceCategories =
    plugin.sourceCategories && plugin.sourceCategories.length > 0
      ? plugin.sourceCategories
      : llm.sourceCategories;

  const allDay = plugin.allDay ?? llm.allDay;

  return {
    isEvent: plugin.isEvent || llm.isEvent,
    title: nonEmpty(plugin.title) ?? nonEmpty(llm.title),
    summary: pickLonger(plugin.summary, llm.summary),
    description: pickLonger(plugin.description, llm.description),
    startAt: nonEmpty(plugin.startAt) ?? nonEmpty(llm.startAt),
    endAt: plugin.endAt !== undefined && plugin.endAt !== null ? plugin.endAt : llm.endAt,
    ...(allDay !== undefined ? { allDay } : {}),
    organizerName: nonEmpty(plugin.organizerName) ?? nonEmpty(llm.organizerName),
    venueName: nonEmpty(plugin.venueName) ?? nonEmpty(llm.venueName),
    venueAddress: nonEmpty(plugin.venueAddress) ?? nonEmpty(llm.venueAddress),
    isRecurring: plugin.isRecurring || llm.isRecurring,
    extractionConfidence: Math.max(plugin.extractionConfidence, llm.extractionConfidence),
    ...(images.length > 0 ? { images } : {}),
    ...(sourceCategories && sourceCategories.length > 0 ? { sourceCategories } : {}),
  };
}
