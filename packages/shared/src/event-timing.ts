/**
 * Shared rules for crawl ingest and expiry cleanup:
 * an event is kept while its effective end (endAt ?? startAt) is still >= now.
 */

export function parseEventInstant(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Effective end instant used for “still relevant” checks. */
export function eventEffectiveEnd(
  startAt: string | Date | null | undefined,
  endAt?: string | Date | null,
): Date | null {
  const start = parseEventInstant(startAt);
  if (!start) return null;
  const end = parseEventInstant(endAt ?? null);
  if (end && end.getTime() >= start.getTime()) return end;
  return start;
}

/**
 * True when the event has not ended yet (upcoming or currently running).
 * Past-only dates must not be imported from crawls.
 */
export function isEventNotExpired(
  startAt: string | Date | null | undefined,
  endAt?: string | Date | null,
  now: Date = new Date(),
): boolean {
  const effectiveEnd = eventEffectiveEnd(startAt, endAt);
  if (!effectiveEnd) return false;
  return effectiveEnd.getTime() >= now.getTime();
}

export function filterNotExpiredEvents<
  T extends { startAt?: string | Date | null; endAt?: string | Date | null },
>(events: readonly T[], now: Date = new Date()): T[] {
  return events.filter((event) => isEventNotExpired(event.startAt, event.endAt, now));
}
