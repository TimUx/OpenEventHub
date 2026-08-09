import type { ClassificationFields, ExtractedEventFields } from '@openeventhub/shared';

export class ExtractionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionParseError';
  }
}

export function parseExtractionJson(raw: string): ExtractedEventFields {
  const parsed = parseJsonObject(raw);
  const allDay = typeof parsed['allDay'] === 'boolean' ? parsed['allDay'] : undefined;
  const images = asStringArray(parsed['images']);
  return {
    isEvent: Boolean(parsed['isEvent']),
    title: asNullableString(parsed['title']),
    summary: asNullableString(parsed['summary']),
    description: asNullableString(parsed['description']),
    startAt: asNullableString(parsed['startAt']),
    endAt: asNullableString(parsed['endAt']),
    ...(allDay !== undefined ? { allDay } : {}),
    organizerName: asNullableString(parsed['organizerName']),
    venueName: asNullableString(parsed['venueName']),
    venueAddress: asNullableString(parsed['venueAddress']),
    isRecurring: Boolean(parsed['isRecurring']),
    extractionConfidence: asConfidence(parsed['extractionConfidence']),
    ...(images.length > 0 ? { images } : {}),
  };
}

export function parseClassificationJson(raw: string): ClassificationFields {
  const parsed = parseJsonObject(raw);
  return {
    categories: asStringArray(parsed['categories']),
    subcategories: asStringArray(parsed['subcategories']),
    tags: asStringArray(parsed['tags']),
    region: asNullableString(parsed['region']),
    district: asNullableString(parsed['district']),
    municipality: asNullableString(parsed['municipality']),
    place: asNullableString(parsed['place']),
    classificationConfidence: asConfidence(parsed['classificationConfidence']),
  };
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let value: unknown;
  try {
    value = JSON.parse(withoutFence) as unknown;
  } catch (error) {
    throw new ExtractionParseError(
      `LLM response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ExtractionParseError('LLM response must be a JSON object');
  }

  return value as Record<string, unknown>;
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function asConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
