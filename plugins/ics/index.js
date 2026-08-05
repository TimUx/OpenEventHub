import { fetchUrlToBuffer } from '../utils/fetch-url.js';
import { parseDateOrNull } from '../utils/parse-date.js';

function unfoldIcsLines(text) {
  // ICS line folding: a newline followed by whitespace continues the previous line.
  return text.replace(/\r?\n[ \t]/g, '');
}

function extractIcsValue(block, fieldName) {
  // Example:
  // SUMMARY:Open Air
  // DTSTART:20260805T170000Z
  const re = new RegExp(`^${fieldName}[^:]*:(.*)$`, 'im');
  const match = re.exec(block);
  return match ? match[1].trim() : null;
}

export function createPlugin() {
  return {
    metadata: {
      pluginType: 'ics',
      name: 'ICS Calendar Plugin',
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
      const text = fetchResult.content.toString('utf-8');
      const unfolded = unfoldIcsLines(text);

      const veventRe = /BEGIN:VEVENT([\\s\\S]*?)END:VEVENT/g;
      const events = [];
      for (const match of unfolded.matchAll(veventRe)) events.push(match[1]);
      return { vevents: events };
    },

    async normalize(parseResult) {
      const events = [];
      for (const vevent of parseResult.vevents) {
        const title = extractIcsValue(vevent, 'SUMMARY');
        const description = extractIcsValue(vevent, 'DESCRIPTION');
        const location = extractIcsValue(vevent, 'LOCATION');

        const startAt = parseDateOrNull(extractIcsValue(vevent, 'DTSTART'));
        const endAt = parseDateOrNull(extractIcsValue(vevent, 'DTEND'));

        const isEvent = Boolean(title && startAt);
        const extractionConfidence = isEvent ? 0.8 : 0.2;

        events.push({
          isEvent,
          title: title ?? null,
          summary: description ?? null,
          description: description ?? null,
          startAt,
          endAt,
          organizerName: null,
          venueName: location ?? null,
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
