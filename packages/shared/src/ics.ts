export type IcsVenueInput = {
  readonly name: string;
  readonly address?: string | null;
  readonly city?: string | null;
};

export type IcsEventInput = {
  readonly id: string;
  readonly slug?: string;
  readonly title: string;
  readonly summary?: string | null;
  readonly description?: string | null;
  readonly startAt: string;
  readonly endAt?: string | null;
  readonly allDay?: boolean;
  readonly venue?: IcsVenueInput | null;
};

export type BuildCalendarIcsOptions = {
  readonly calendarName?: string;
  readonly prodId?: string;
  /** Absolute URL for each event (shown as URL: in VEVENT). */
  readonly eventUrl?: (event: IcsEventInput) => string | null;
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Format an Instant as UTC ICS timestamp (YYYYMMDDTHHMMSSZ). */
export function toIcsUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ICS: ${iso}`);
  }
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Format an Instant as UTC ICS date (YYYYMMDD) for all-day events. */
export function toIcsUtcDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ICS: ${iso}`);
  }
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

export function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\n');
}

export function foldIcsLine(line: string): string {
  const limit = 75;
  if (line.length <= limit) {
    return line;
  }
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, limit));
  remaining = remaining.slice(limit);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, limit - 1)}`);
    remaining = remaining.slice(limit - 1);
  }
  return parts.join('\r\n');
}

function venueLocation(venue: IcsVenueInput | null | undefined): string | null {
  if (!venue) {
    return null;
  }
  const parts = [venue.name, venue.address, venue.city].filter((part): part is string =>
    Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function resolveEndAt(event: IcsEventInput): string {
  if (event.endAt) {
    return event.endAt;
  }
  const start = new Date(event.startAt);
  return new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

export function buildVEventLines(
  event: IcsEventInput,
  stamp: string,
  eventUrl?: string | null,
): string[] {
  const uid = `${event.id}@openeventhub`;
  const location = venueLocation(event.venue);
  const descriptionParts = [event.summary, event.description, eventUrl].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  const lines = ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`];

  if (event.allDay) {
    const startDay = toIcsUtcDate(event.startAt);
    // ICS all-day DTEND is exclusive (day after the last inclusive day).
    const exclusiveEnd = new Date(event.endAt ?? event.startAt);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${startDay}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsUtcDate(exclusiveEnd.toISOString())}`);
  } else {
    lines.push(`DTSTART:${toIcsUtc(event.startAt)}`);
    lines.push(`DTEND:${toIcsUtc(resolveEndAt(event))}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join('\n\n'))}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  if (eventUrl) {
    lines.push(`URL:${eventUrl}`);
  }
  lines.push('END:VEVENT');
  return lines;
}

/** Build a multi-event (or single-event) iCalendar document. */
export function buildCalendarIcs(
  events: readonly IcsEventInput[],
  options: BuildCalendarIcsOptions = {},
): string {
  const stamp = toIcsUtc(new Date().toISOString());
  const calendarName = options.calendarName ?? 'OpenEventHub';
  const prodId = options.prodId ?? '-//OpenEventHub//Event Feed//EN';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const event of events) {
    const url = options.eventUrl?.(event) ?? null;
    lines.push(...buildVEventLines(event, stamp, url));
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function buildEventIcs(event: IcsEventInput, pageUrl: string): string {
  return buildCalendarIcs([event], {
    calendarName: event.title,
    prodId: '-//OpenEventHub//Event//EN',
    eventUrl: () => pageUrl,
  });
}

export function eventIcsFilename(event: Pick<IcsEventInput, 'id' | 'slug'>): string {
  const base = (event.slug || event.id).replaceAll(/[^a-zA-Z0-9._-]+/g, '-');
  return `${base || 'event'}.ics`;
}

export function calendarFeedFilename(): string {
  return 'openeventhub.ics';
}

/** Convert an https calendar URL to webcal:// for native subscribe handlers. */
export function toWebcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https:/i, 'webcal:').replace(/^http:/i, 'webcal:');
}
