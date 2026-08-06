/**
 * Detect whether a temporal string carries an explicit clock time.
 * Date-only values must be stored/shown as all-day (no invented local times).
 */

export function temporalHasClockTime(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  if (/^\d{8}$/.test(trimmed)) return false;
  // ICS compact: 20260805T120000(Z) — time after T
  if (/^\d{8}T\d{6}Z?$/i.test(trimmed)) {
    return !/T000000Z?$/i.test(trimmed);
  }
  // ISO / RFC822-ish with hour:minute
  const timeMatch = /(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (!timeMatch) return false;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? '0');
  // Midnight-only placeholders from date-only parsers are not real clock times.
  if (hour === 0 && minute === 0 && second === 0) {
    // Offset/Z alone still means "date at midnight UTC" from our date-only path.
    return false;
  }
  return true;
}

export function inferAllDay(
  startAt: string | null | undefined,
  endAt?: string | null,
  explicit?: boolean | null,
): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  if (!startAt) return false;
  if (temporalHasClockTime(startAt)) return false;
  if (endAt && temporalHasClockTime(endAt)) return false;
  return true;
}
