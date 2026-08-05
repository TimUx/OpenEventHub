import { fetchUrlToBuffer } from '../utils/fetch-url.js';

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function textFromCellHtml(rowHtml, cellClass) {
  const re = new RegExp(
    `<td[^>]*class=["'][^"']*\\\\b${cellClass}\\\\b[^"']*["'][^>]*>([\\\\s\\\\S]*?)<\\\\/td>`,
    'i',
  );
  const match = re.exec(rowHtml);
  if (!match) return null;
  return decodeHtmlEntities(match[1].replace(/<[^>]*>/g, '').trim());
}

function toIsoOrNull(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createPlugin() {
  return {
    metadata: {
      pluginType: 'html',
      name: 'HTML Table Plugin',
      version: '1.0.0',
    },

    async initialize() {
      // Stateless for the first milestone.
    },

    async discover(context) {
      return { urls: [context.sourceUrl] };
    },

    async fetch(context) {
      return fetchUrlToBuffer(context.sourceUrl);
    },

    async parse(fetchResult) {
      const html = fetchResult.content.toString('utf-8');

      const rowRe =
        /<tr[^>]*(?:data-oeh-event|data-event|class=["'][^"']*\boeh-event\b[^"']*["'])[^>]*>([\s\S]*?)<\/tr>/gi;
      const matches = [...html.matchAll(rowRe)];
      const rows = matches.map((m) => m[1]);

      // Fallback: if rows aren't marked, try a single table row.
      if (rows.length === 0) {
        const genericRowRe = /<tr>([\s\S]*?)<\/tr>/gi;
        for (const m of html.matchAll(genericRowRe)) rows.push(m[1]);
      }

      return { rows };
    },

    async normalize(parseResult) {
      const events = [];
      for (const rowHtml of parseResult.rows) {
        const title = textFromCellHtml(rowHtml, 'title');
        const summary = textFromCellHtml(rowHtml, 'summary');
        const description = textFromCellHtml(rowHtml, 'description');

        const startAtRaw =
          textFromCellHtml(rowHtml, 'start-at') ?? textFromCellHtml(rowHtml, 'start');
        const endAtRaw = textFromCellHtml(rowHtml, 'end-at') ?? textFromCellHtml(rowHtml, 'end');

        const startAt = toIsoOrNull(startAtRaw);
        const endAt = toIsoOrNull(endAtRaw);

        const isEvent = Boolean(title && startAt);
        const extractionConfidence = isEvent ? 0.9 : 0.3;

        events.push({
          isEvent,
          title: title ?? null,
          summary: summary ?? null,
          description: description ?? null,
          startAt,
          endAt,
          organizerName: null,
          venueName: null,
          venueAddress: null,
          isRecurring: false,
          extractionConfidence,
        });
      }

      // Filter out rows where it's definitely not an event.
      return {
        events: events.filter((e) => e.isEvent),
      };
    },

    async emit(normalized) {
      return normalized.events;
    },

    async healthCheck() {
      return { status: 'ok' };
    },
  };
}

// Default export for convenience.
export default createPlugin;
