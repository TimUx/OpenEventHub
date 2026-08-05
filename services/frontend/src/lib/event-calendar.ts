import type { ApiEvent } from './api';
import { eventHasCoordinates } from './map-events';

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

export function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\n');
}

function foldIcsLine(line: string): string {
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

function venueLocation(event: ApiEvent): string | null {
  const venue = event.venue;
  if (!venue) {
    return null;
  }
  const parts = [venue.name, venue.address, venue.city].filter((part): part is string =>
    Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function resolveEndAt(event: ApiEvent): string {
  if (event.endAt) {
    return event.endAt;
  }
  const start = new Date(event.startAt);
  return new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

export function buildEventMapHref(eventId: string): string {
  return `/map?event=${encodeURIComponent(eventId)}`;
}

export function canShowEventOnMap(event: ApiEvent): boolean {
  return eventHasCoordinates(event);
}

/**
 * Build a single-event iCalendar (.ics) document for local calendar apps
 * (Outlook, Thunderbird, Apple Calendar, Google Calendar import, phones).
 */
export function buildEventIcs(event: ApiEvent, pageUrl: string): string {
  const uid = `${event.id}@openeventhub`;
  const stamp = toIcsUtc(new Date().toISOString());
  const start = toIcsUtc(event.startAt);
  const end = toIcsUtc(resolveEndAt(event));
  const location = venueLocation(event);
  const descriptionParts = [event.summary, event.description, pageUrl].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OpenEventHub//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeIcsText(descriptionParts.join('\n\n'))}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }
  lines.push(`URL:${pageUrl}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function eventIcsFilename(event: ApiEvent): string {
  const base = (event.slug || event.id).replaceAll(/[^a-zA-Z0-9._-]+/g, '-');
  return `${base || 'event'}.ics`;
}

/** Trigger a browser download of the event as .ics. */
export function downloadEventIcs(event: ApiEvent, pageUrl: string): void {
  const ics = buildEventIcs(event, pageUrl);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = eventIcsFilename(event);
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
