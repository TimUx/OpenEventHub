import { fetchUrlToBuffer } from '../utils/fetch-url.js';

function decodeCdata(value) {
  const trimmed = String(value ?? '').trim();
  const cdataRe = /^<!\[CDATA\[([\s\S]*)\]\]>$/i;
  const match = cdataRe.exec(trimmed);
  return match ? match[1] : trimmed;
}

function extractTagValue(xml, tagName) {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = re.exec(xml);
  if (!match) return null;
  return decodeCdata(match[1]).replace(/<!\[CDATA\[|]]>/g, '').trim() || null;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // RSS pubDate is typically RFC822. Date.parse is good enough for the milestone fixture set.
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createPlugin() {
  return {
    metadata: {
      pluginType: 'rss',
      name: 'RSS Feed Plugin',
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
      const xml = fetchResult.content.toString('utf-8');

      const itemRe = /<item>([\s\S]*?)<\/item>/gi;
      const items = [...xml.matchAll(itemRe)].map((m) => m[1]);
      return { items };
    },

    async normalize(parseResult) {
      const events = [];
      for (const itemHtml of parseResult.items) {
        const title = extractTagValue(itemHtml, 'title');
        const description = extractTagValue(itemHtml, 'description');
        const startAt = toIsoOrNull(extractTagValue(itemHtml, 'pubDate'));

        const summary = description ? description.slice(0, 500) : null;
        const isEvent = Boolean(title && startAt);
        const extractionConfidence = isEvent ? 0.85 : 0.2;

        events.push({
          isEvent,
          title: title ?? null,
          summary: summary ?? null,
          description: description ?? null,
          startAt,
          endAt: null,
          organizerName: null,
          venueName: null,
          venueAddress: null,
          isRecurring: false,
          extractionConfidence,
        });
      }

      return { events: events.filter((e) => e.isEvent) };
    },

    async emit(normalized) {
      return normalized.events;
    },

    async healthCheck() {
      return { status: 'ok' };
    },
  };
}

export default createPlugin;

