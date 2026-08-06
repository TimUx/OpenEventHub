import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractToubizWidgetConfig, mapToubizEventToOccurrences } from '../utils/toubiz.js';
import { createPlugin } from './index.js';

describe('toubiz plugin', () => {
  it('extracts widget api-token and base-uri from HTML', () => {
    const html = `
      <toubiz-widget
        route="/event"
        api-token="$2y$10$exampleTokenValue"
        base-uri="https://mein.toubiz.de"
        serialized-configuration='{ query:{ filter:{ element: "events" } } }'
      ></toubiz-widget>
    `;
    const config = extractToubizWidgetConfig(html);
    assert.ok(config);
    assert.equal(config.apiToken, '$2y$10$exampleTokenValue');
    assert.equal(config.baseUri, 'https://mein.toubiz.de');
    assert.equal(config.route, '/event');
  });

  it('maps future dateIntervals to occurrences and skips past/canceled', () => {
    const event = {
      name: 'Testfest',
      intro: '<p>Hallo <b>Welt</b></p>',
      author: 'Rotkäppchenland',
      hasSchedule: true,
      canceled: false,
      location: { name: 'Marktplatz' },
      dateIntervals: [
        { date: '2020-01-01', startAt: '10:00:00', endAt: '12:00:00', canceled: false },
        {
          date: '2026-09-01',
          startAt: '18:00:00',
          endAt: '21:00:00',
          end: '2026-09-01',
          canceled: false,
          eventLocationAddress: {
            name: 'Rathaus',
            street: 'Hauptstr.',
            streetNumber: '1',
            zip: '34576',
            city: 'Homberg',
            country: 'DE',
          },
        },
        { date: '2026-09-02', startAt: '18:00:00', canceled: true },
      ],
    };
    const occurrences = mapToubizEventToOccurrences(event, '2026-08-06');
    assert.equal(occurrences.length, 1);
    assert.equal(occurrences[0]?.title, 'Testfest');
    assert.equal(occurrences[0]?.startAt, '2026-09-01T18:00:00.000Z');
    assert.equal(occurrences[0]?.endAt, '2026-09-01T21:00:00.000Z');
    assert.equal(occurrences[0]?.venueName, 'Rathaus');
    assert.match(occurrences[0]?.venueAddress ?? '', /Homberg/);
    assert.equal(occurrences[0]?.summary, 'Hallo Welt');
  });

  it('falls back to nextDate when intervals are empty', () => {
    const event = {
      name: 'Konzert',
      canceled: false,
      nextDate: { date: '2026-08-20', startAt: '19:30:00', isCancelled: false },
      dateIntervals: [],
    };
    const occurrences = mapToubizEventToOccurrences(event, '2026-08-06');
    assert.equal(occurrences.length, 1);
    assert.equal(occurrences[0]?.startAt, '2026-08-20T19:30:00.000Z');
  });

  it('createPlugin factory loads', async () => {
    const plugin = createPlugin();
    assert.equal(plugin.metadata.pluginType, 'toubiz');
    const health = await plugin.healthCheck();
    assert.equal(health.status, 'ok');
  });
});
