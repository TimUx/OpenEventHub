/**
 * Mirror of @openeventhub/shared event-timing for crawler plugins (plain ESM).
 * Keep an event while effective end (endAt ?? startAt) is still >= now.
 */

export function parseEventInstant(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function eventEffectiveEnd(startAt, endAt) {
  const start = parseEventInstant(startAt);
  if (!start) return null;
  const end = parseEventInstant(endAt ?? null);
  if (end && end.getTime() >= start.getTime()) return end;
  return start;
}

export function isEventNotExpired(startAt, endAt, now = new Date()) {
  const effectiveEnd = eventEffectiveEnd(startAt, endAt);
  if (!effectiveEnd) return false;
  return effectiveEnd.getTime() >= now.getTime();
}

export function filterNotExpiredEvents(events, now = new Date()) {
  return (events ?? []).filter((event) => isEventNotExpired(event.startAt, event.endAt, now));
}
