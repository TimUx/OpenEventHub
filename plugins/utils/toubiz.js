/**
 * Toubiz / mein.toubiz.de event-management adapter.
 * Used by the HTML plugin when a <toubiz-widget> is embedded, and by pluginType `toubiz`.
 */

import { filterNotExpiredEvents, isEventNotExpired } from './is-future-event.js';
import { inferAllDay } from './temporal-all-day.js';

const DEFAULT_BASE_URI = 'https://mein.toubiz.de';
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGES = 100;

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTime(value) {
  if (!value) return '00:00:00';
  const trimmed = String(value).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return '00:00:00';
}

/** Wall-clock date+time as UTC ISO (consistent with other HTML listing parsers). */
function toIso(date, time) {
  if (!date) return null;
  const day = String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return `${day}T${normalizeTime(time)}.000Z`;
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Extract Toubiz widget configuration from an embedding HTML page.
 * @returns {{ apiToken: string, baseUri: string, route: string } | null}
 */
export function extractToubizWidgetConfig(html) {
  const block =
    /<toubiz-widget\b([^>]*)>([\s\S]*?)<\/toubiz-widget>/i.exec(String(html ?? '')) ??
    /<toubiz-widget\b([^>]*)\/>/i.exec(String(html ?? ''));
  if (!block) return null;
  const attrs = block[1] ?? '';
  const tokenMatch = /\bapi-token=["']([^"']+)["']/i.exec(attrs);
  if (!tokenMatch?.[1]) return null;
  const baseMatch = /\bbase-uri=["']([^"']+)["']/i.exec(attrs);
  const routeMatch = /\broute=["']([^"']+)["']/i.exec(attrs);
  return {
    apiToken: tokenMatch[1],
    baseUri: (baseMatch?.[1] || DEFAULT_BASE_URI).replace(/\/$/, ''),
    route: routeMatch?.[1] || '/event',
  };
}

function addressLine(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const country = String(addr.country ?? '').trim();
  const skipCountry = /^(de|deu|deutschland|germany)$/i.test(country);
  const parts = [
    [addr.street, addr.streetNumber].filter(Boolean).join(' '),
    [addr.zip, addr.city].filter(Boolean).join(' '),
    skipCountry ? '' : country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function sourceCategories(event) {
  const name = String(event?.category?.name ?? '').trim();
  return name ? [name] : [];
}

function eventText(event) {
  const description = stripHtml(event?.description || '');
  const intro = stripHtml(event?.intro || '');
  const plain = description || intro;
  return {
    summary: intro ? intro.slice(0, 280) : plain ? plain.slice(0, 280) : null,
    description: plain || null,
  };
}

function toOccurrence(event, intervalLike, today) {
  const date = intervalLike?.date || intervalLike?.end || null;
  if (!date || date < today) return null;
  if (intervalLike.canceled || intervalLike.isCancelled || intervalLike.closed || event?.canceled) {
    return null;
  }
  const startAt = toIso(date, intervalLike.startAt);
  if (!startAt) return null;
  const endDate = intervalLike.end && intervalLike.end >= date ? intervalLike.end : date;
  const endAt = intervalLike.endAt ? toIso(endDate, intervalLike.endAt) : null;
  if (!isEventNotExpired(startAt, endAt)) return null;

  const loc = intervalLike.eventLocationAddress || null;
  const venueName = event?.location?.name || loc?.name || null;
  const venueAddress = addressLine(loc);
  const text = eventText(event);
  const categories = sourceCategories(event);
  return {
    isEvent: true,
    title: String(event?.name || '').trim() || null,
    summary: text.summary,
    description: text.description,
    startAt,
    endAt,
    allDay: inferAllDay(startAt, endAt, !intervalLike.startAt && !intervalLike.endAt),
    organizerName: event?.author || event?.client?.name || null,
    venueName,
    venueAddress,
    isRecurring: Boolean(event?.hasSchedule) || (event?.dateIntervals?.length ?? 0) > 1,
    extractionConfidence: 0.95,
    ...(categories.length > 0 ? { sourceCategories: categories } : {}),
  };
}

function occurrenceFromInterval(event, interval, today) {
  return toOccurrence(event, interval, today);
}

function occurrenceFromNextDate(event, today) {
  const next = event.nextDate;
  if (!next || typeof next !== 'object') return null;
  return toOccurrence(
    event,
    {
      date: next.date,
      startAt: next.startAt,
      endAt: next.endAt,
      end: next.date,
      canceled: next.isCancelled,
      closed: next.closed,
      eventLocationAddress: next.eventLocationAddress,
    },
    today,
  );
}

/**
 * Map one Toubiz eventDate (nested event + eventLocationAddress) to an occurrence.
 */
export function mapToubizEventDateToOccurrence(item, today = todayUtcDate()) {
  if (!item || typeof item !== 'object') return null;
  return toOccurrence(item.event, item, today);
}

/**
 * Map one Toubiz event payload into one or more ExtractedEventFields (future only).
 */
export function mapToubizEventToOccurrences(event, today = todayUtcDate()) {
  if (!event || event.canceled) return [];
  const intervals = Array.isArray(event.dateIntervals) ? event.dateIntervals : [];
  const fromIntervals = intervals
    .map((interval) => occurrenceFromInterval(event, interval, today))
    .filter(Boolean);
  if (fromIntervals.length > 0) return fromIntervals;
  const single = occurrenceFromNextDate(event, today);
  return single ? [single] : [];
}

async function fetchJson(url, apiToken) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Toubiz API ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

function pushUniqueOccurrence(events, seen, occurrence) {
  if (!occurrence?.title || !occurrence.startAt) return;
  const key = `${occurrence.title}|${occurrence.startAt}|${occurrence.endAt ?? ''}`;
  if (seen.has(key)) return;
  seen.add(key);
  events.push(occurrence);
}

async function paginateJson(startUrl, apiToken, maxPages) {
  const pages = [];
  let url = startUrl;
  for (let page = 0; page < maxPages && url; page += 1) {
    const data = await fetchJson(url, apiToken);
    const payload = Array.isArray(data?.payload) ? data.payload : [];
    pages.push(payload);
    url = data?._links?.nextPage || null;
    if (!payload.length) break;
  }
  return pages.flat();
}

const DETAIL_CONCURRENCY = 4;

async function fetchEventDetails(ids, apiToken, baseUri) {
  const unique = [...new Set(ids.filter(Boolean))];
  const details = new Map();
  let cursor = 0;

  async function worker() {
    while (cursor < unique.length) {
      const id = unique[cursor];
      cursor += 1;
      try {
        const data = await fetchJson(`${baseUri}/api/v1/event/${id}`, apiToken);
        const payload = data?.payload;
        if (payload && typeof payload === 'object') {
          details.set(id, payload);
        }
      } catch {
        // List payload is enough for title/date; description stays empty.
      }
    }
  }

  const n = Math.min(DETAIL_CONCURRENCY, unique.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return details;
}

function mergeEventDetail(listEvent, detail) {
  if (!detail) return listEvent;
  return {
    ...listEvent,
    intro: detail.intro || listEvent?.intro,
    description: detail.description || listEvent?.description,
    category: detail.category || listEvent?.category,
    location: detail.location || listEvent?.location,
  };
}

async function fetchFromEventDates(options) {
  const { apiToken, baseUri, dateAfter, maxPages } = options;
  const startUrl =
    `${baseUri}/api/v1/eventDates?unlicensed=1` +
    `&filter%5Bdate%5D%5Bafter%5D=${encodeURIComponent(dateAfter)}` +
    `&pagination%5Bpage%5D=1`;
  const items = await paginateJson(startUrl, apiToken, maxPages);
  if (items.length === 0) return [];

  const details = await fetchEventDetails(
    items.map((item) => item?.event?.id),
    apiToken,
    baseUri,
  );

  const events = [];
  const seen = new Set();
  for (const item of items) {
    const merged = {
      ...item,
      event: mergeEventDetail(item?.event, item?.event?.id ? details.get(item.event.id) : null),
    };
    pushUniqueOccurrence(events, seen, mapToubizEventDateToOccurrence(merged, dateAfter));
  }
  return events;
}

async function fetchFromEventList(options) {
  const { apiToken, baseUri, dateAfter, pageSize, maxPages } = options;
  const startUrl =
    `${baseUri}/api/v1/events?unlicensed=1` +
    `&filter%5Bdate%5D%5Bafter%5D=${encodeURIComponent(dateAfter)}` +
    `&pagination%5BitemsPerPage%5D=${pageSize}` +
    `&pagination%5Bpage%5D=1` +
    `&invisible=0`;
  const items = await paginateJson(startUrl, apiToken, maxPages);
  const details = await fetchEventDetails(
    items.map((item) => item?.id),
    apiToken,
    baseUri,
  );

  const events = [];
  const seen = new Set();
  for (const item of items) {
    const merged = mergeEventDetail(item, item?.id ? details.get(item.id) : null);
    for (const occurrence of mapToubizEventToOccurrences(merged, dateAfter)) {
      pushUniqueOccurrence(events, seen, occurrence);
    }
  }
  return events;
}

/**
 * Paginate future Toubiz occurrences (eventDates when available, else events + intervals).
 * Event details are fetched once per unique event so description/category are complete.
 * @param {{ apiToken: string, baseUri?: string, dateAfter?: string, pageSize?: number, maxPages?: number }} options
 */
export async function fetchToubizFutureEvents(options) {
  const apiToken = options.apiToken;
  if (!apiToken) throw new Error('Toubiz apiToken is required');
  const ctx = {
    apiToken,
    baseUri: (options.baseUri || DEFAULT_BASE_URI).replace(/\/$/, ''),
    dateAfter: options.dateAfter || todayUtcDate(),
    pageSize: options.pageSize || DEFAULT_PAGE_SIZE,
    maxPages: options.maxPages || MAX_PAGES,
  };

  let events = [];
  try {
    events = await fetchFromEventDates(ctx);
  } catch {
    events = [];
  }
  if (events.length === 0) {
    events = await fetchFromEventList(ctx);
  }

  events.sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  return filterNotExpiredEvents(events);
}

/**
 * High-level: HTML embedding page → future events via Toubiz API.
 * Returns [] when no widget is present.
 */
export async function fetchToubizEventsFromHtml(html, options = {}) {
  const config = extractToubizWidgetConfig(html);
  if (!config) return [];
  return fetchToubizFutureEvents({
    apiToken: options.apiToken || config.apiToken,
    baseUri: options.baseUri || config.baseUri,
    dateAfter: options.dateAfter,
    pageSize: options.pageSize,
    maxPages: options.maxPages,
  });
}
