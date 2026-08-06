/**
 * Plugin-side mirror of @openeventhub/shared temporal-all-day helpers.
 */

export function temporalHasClockTime(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  if (/^\d{8}$/.test(trimmed)) return false;
  if (/^\d{8}T\d{6}Z?$/i.test(trimmed)) {
    return !/T000000Z?$/i.test(trimmed);
  }
  const timeMatch = /(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (!timeMatch) return false;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? '0');
  if (hour === 0 && minute === 0 && second === 0) return false;
  return true;
}

export function inferAllDay(startAt, endAt, explicit) {
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (!startAt) return false;
  if (temporalHasClockTime(startAt)) return false;
  if (endAt && temporalHasClockTime(endAt)) return false;
  return true;
}
