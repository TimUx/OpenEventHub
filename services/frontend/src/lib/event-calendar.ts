import {
  buildCalendarIcs,
  buildEventIcs as buildSharedEventIcs,
  eventIcsFilename as sharedEventIcsFilename,
  toWebcalUrl,
  type IcsEventInput,
} from '@openeventhub/shared';

import type { ApiEvent } from './api';
import { eventHasCoordinates } from './map-events';

export { toIcsUtc, escapeIcsText, toWebcalUrl } from '@openeventhub/shared';

function toIcsEvent(event: ApiEvent): IcsEventInput {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    allDay: Boolean(event.allDay),
    venue: event.venue
      ? {
          name: event.venue.name,
          address: event.venue.address,
          city: event.venue.city,
        }
      : null,
  };
}

export function buildEventMapHref(eventId: string): string {
  return `/map?event=${encodeURIComponent(eventId)}`;
}

export function canShowEventOnMap(event: ApiEvent): boolean {
  return eventHasCoordinates(event);
}

export function buildEventIcs(event: ApiEvent, pageUrl: string): string {
  return buildSharedEventIcs(toIcsEvent(event), pageUrl);
}

export function buildEventsIcs(
  events: readonly ApiEvent[],
  options: {
    readonly calendarName?: string;
    readonly eventPageUrl: (event: ApiEvent) => string;
  },
): string {
  return buildCalendarIcs(events.map(toIcsEvent), {
    calendarName: options.calendarName ?? 'OpenEventHub',
    eventUrl: (icsEvent) => {
      const match = events.find((event) => event.id === icsEvent.id);
      return match ? options.eventPageUrl(match) : null;
    },
  });
}

export function eventIcsFilename(event: ApiEvent): string {
  return sharedEventIcsFilename(event);
}

function triggerIcsDownload(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Trigger a browser download of one event as .ics. */
export function downloadEventIcs(event: ApiEvent, pageUrl: string): void {
  triggerIcsDownload(buildEventIcs(event, pageUrl), eventIcsFilename(event));
}

/** Trigger a browser download of many events as one .ics calendar. */
export function downloadEventsIcs(
  events: readonly ApiEvent[],
  options: {
    readonly calendarName?: string;
    readonly filename?: string;
    readonly eventPageUrl: (event: ApiEvent) => string;
  },
): void {
  if (events.length === 0) {
    return;
  }
  const ics = buildEventsIcs(events, options);
  triggerIcsDownload(ics, options.filename ?? 'openeventhub-events.ics');
}

export function buildCalendarFeedPath(query?: Record<string, string>): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params.set(key, value);
      }
    }
  }
  const qs = params.toString();
  return qs ? `/calendar.ics?${qs}` : '/calendar.ics';
}

export function buildWebcalSubscribeUrl(httpsFeedUrl: string): string {
  return toWebcalUrl(httpsFeedUrl);
}
