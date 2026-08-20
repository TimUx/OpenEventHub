import { fetchUrlToBuffer } from '../utils/fetch-url.js';
import {
  extractToubizWidgetConfig,
  fetchToubizEventsFromHtml,
  fetchToubizFutureEvents,
  mapToubizEventToOccurrences,
} from '../utils/toubiz.js';

export function createPlugin() {
  return {
    metadata: {
      pluginType: 'toubiz',
      name: 'Toubiz Event Management',
      version: '1.1.0',
    },

    async initialize() {},

    async discover(context) {
      return { urls: [context.sourceUrl] };
    },

    async fetch(context) {
      // Prefer fetching the embedding HTML page (to discover api-token), unless config already has one.
      const config =
        context.sourceConfig && typeof context.sourceConfig === 'object'
          ? context.sourceConfig
          : {};
      if (config.apiToken && String(context.sourceUrl).includes('mein.toubiz.de/api')) {
        const body = Buffer.from(
          JSON.stringify({
            apiToken: config.apiToken,
            baseUri: config.baseUri || 'https://mein.toubiz.de',
            direct: true,
          }),
          'utf-8',
        );
        return { content: body, mimeType: 'application/json' };
      }
      return fetchUrlToBuffer(context.sourceUrl);
    },

    async parse(fetchResult) {
      const text = fetchResult.content.toString('utf-8');
      if (fetchResult.mimeType?.includes('json')) {
        return { mode: 'direct', config: JSON.parse(text) };
      }
      return { mode: 'html', html: text };
    },

    async normalize(parseResult) {
      const config =
        parseResult.mode === 'direct'
          ? parseResult.config
          : extractToubizWidgetConfig(parseResult.html ?? '');
      if (!config?.apiToken) {
        return { events: [] };
      }
      const events =
        parseResult.mode === 'html'
          ? await fetchToubizEventsFromHtml(parseResult.html)
          : await fetchToubizFutureEvents({
              apiToken: config.apiToken,
              baseUri: config.baseUri,
            });
      return { events };
    },

    async emit(normalized) {
      return normalized.events;
    },

    async healthCheck() {
      return { status: 'ok' };
    },
  };
}

export const __test = {
  extractToubizWidgetConfig,
  mapToubizEventToOccurrences,
  fetchToubizFutureEvents,
};

export default createPlugin;
