/**
 * Toubiz / mein.toubiz.de event-management adapter.
 * Used by the HTML plugin when a <toubiz-widget> is embedded, and by pluginType `toubiz`.
 */

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
  const parts = [
    [addr.street, addr.streetNumber].filter(Boolean).join(' '),
    [addr.zip, addr.city].filter(Boolean).join(' '),
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function occurrenceFromInterval(event, interval, today) {
  const date = interval?.date || interval?.end || null;
  if (!date || date < today) return null;
  if (interval.canceled || interval.isCancelled || interval.closed) return null;
  const startAt = toIso(date, interval.startAt);
  if (!startAt) return null;
  const endDate = interval.end && interval.end >= date ? interval.end : date;
  const endAt = interval.endAt ? toIso(endDate, interval.endAt) : null;
  const loc = interval.eventLocationAddress || null;
  const venueName = loc?.name || event.location?.name || null;
  const venueAddress = addressLine(loc);
  const plain = stripHtml(event.intro || event.description || '');
  return {
    isEvent: true,
    title: String(event.name || '').trim() || null,
    summary: plain ? plain.slice(0, 280) : null,
    description: plain || null,
    startAt,
    endAt,
    organizerName: event.author || event.client?.name || null,
    venueName,
    venueAddress,
    isRecurring: Boolean(event.hasSchedule) || (event.dateIntervals?.length ?? 0) > 1,
    extractionConfidence: 0.95,
  };
}

function occurrenceFromNextDate(event, today) {
  const next = event.nextDate;
  if (!next || typeof next !== 'object') return null;
  return occurrenceFromInterval(
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

/**
 * Paginate future Toubiz events and expand date intervals.
 * @param {{ apiToken: string, baseUri?: string, dateAfter?: string, pageSize?: number, maxPages?: number }} options
 */
export async function fetchToubizFutureEvents(options) {
  const apiToken = options.apiToken;
  if (!apiToken) throw new Error('Toubiz apiToken is required');
  const baseUri = (options.baseUri || DEFAULT_BASE_URI).replace(/\/$/, '');
  const dateAfter = options.dateAfter || todayUtcDate();
  const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
  const maxPages = options.maxPages || MAX_PAGES;

  const events = [];
  const seen = new Set();
  let url =
    `${baseUri}/api/v1/events?unlicensed=1` +
    `&filter%5Bdate%5D%5Bafter%5D=${encodeURIComponent(dateAfter)}` +
    `&pagination%5BitemsPerPage%5D=${pageSize}` +
    `&pagination%5Bpage%5D=1` +
    `&invisible=0`;

  for (let page = 0; page < maxPages && url; page += 1) {
    const data = await fetchJson(url, apiToken);
    const payload = Array.isArray(data?.payload) ? data.payload : [];
    for (const item of payload) {
      for (const occurrence of mapToubizEventToOccurrences(item, dateAfter)) {
        if (!occurrence.title || !occurrence.startAt) continue;
        const key = `${occurrence.title}|${occurrence.startAt}|${occurrence.endAt ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        events.push(occurrence);
      }
    }
    url = data?._links?.nextPage || null;
    if (!payload.length) break;
  }

  events.sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  return events;
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
