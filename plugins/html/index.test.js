import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { __test, createPlugin } from './index.js';

describe('html plugin multi-format listing parser', () => {
  it('parses Divi-style German date + title lines under month headings', async () => {
    const html = `
      <div class="et_pb_text_inner"><h3>August 2026</h3>
      <p>01.08. + 02.08.<br />Hüttenkirmes Olberode</p>
      <p>07.08. – 09.08.<br />Kirmes Niedergrenzebach</p>
      <p>15 + 16.08.2026 <br />Wiesenfest in Ascherode</p>
      <p>28.08. – 30.08.<br />Hauptschwenda Kirmes</p></div>
    `;

    const plugin = createPlugin();
    const normalized = await plugin.normalize({ html });
    assert.equal(normalized.events.length, 4);
    assert.equal(normalized.events[0]?.title, 'Hüttenkirmes Olberode');
    assert.equal(normalized.events[0]?.startAt, '2026-08-01T00:00:00.000Z');
    assert.equal(normalized.events[0]?.endAt, '2026-08-02T00:00:00.000Z');
    assert.equal(normalized.events[1]?.title, 'Kirmes Niedergrenzebach');
    assert.equal(normalized.events[2]?.title, 'Wiesenfest in Ascherode');
    assert.equal(normalized.events[3]?.title, 'Hauptschwenda Kirmes');
  });

  it('parses unordered lists', async () => {
    const html = `
      <h2>Termine 2026</h2>
      <ul>
        <li>04.04.2026 Osterfeuer Allendorf</li>
        <li>10.07. – 12.07. Elnrode Kirmes</li>
      </ul>
    `;
    const normalized = await createPlugin().normalize({ html });
    assert.equal(normalized.events.length, 2);
    assert.equal(normalized.events[0]?.title, 'Osterfeuer Allendorf');
    assert.equal(normalized.events[0]?.startAt, '2026-04-04T00:00:00.000Z');
    assert.equal(normalized.events[1]?.title, 'Elnrode Kirmes');
    assert.equal(normalized.events[1]?.startAt, '2026-07-10T00:00:00.000Z');
  });

  it('parses generic table rows without oeh classes', async () => {
    const html = `
      <table>
        <tr><th>Datum</th><th>Event</th></tr>
        <tr><td>12.09.2026</td><td>Jazz Nacht am Gasteig</td></tr>
        <tr><td>2026-10-03</td><td>Die Räuber</td></tr>
      </table>
    `;
    const normalized = await createPlugin().normalize({ html });
    assert.ok(normalized.events.length >= 2);
    assert.ok(normalized.events.some((e) => e.title === 'Jazz Nacht am Gasteig'));
    assert.ok(normalized.events.some((e) => e.title === 'Die Räuber'));
  });

  it('parses event cards in divs', async () => {
    const html = `
      <div class="event-card">
        <h3>Sommerlauf Olympiapark</h3>
        <time datetime="2026-08-23T07:00:00+02:00">23.08.2026</time>
      </div>
      <div class="termin">
        <span class="date">01.08.2026</span>
        <span class="name">Hüttenkirmes Olberode</span>
      </div>
    `;
    const normalized = await createPlugin().normalize({ html });
    assert.ok(
      normalized.events.some(
        (e) => e.title.includes('Sommerlauf') || e.title.includes('Olympiapark'),
      ),
    );
    assert.ok(normalized.events.some((e) => e.title.includes('Hüttenkirmes')));
  });

  it('parses JSON-LD Event objects', async () => {
    const html = `
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Konzert im Park",
        "startDate": "2026-09-01T18:00:00+02:00",
        "endDate": "2026-09-01T22:00:00+02:00",
        "location": { "@type": "Place", "name": "Stadtpark" }
      }
      </script>
    `;
    const normalized = await createPlugin().normalize({ html });
    assert.equal(normalized.events.length, 1);
    assert.equal(normalized.events[0]?.title, 'Konzert im Park');
    assert.equal(normalized.events[0]?.venueName, 'Stadtpark');
    assert.ok(normalized.events[0]?.startAt?.startsWith('2026-09-01'));
  });

  it('parses marked oeh-event table rows', async () => {
    const html = `
      <table>
        <tr class="oeh-event">
          <td class="title">Jazz Nacht</td>
          <td class="start-at">2026-09-12T16:00:00.000Z</td>
          <td class="end-at">2026-09-12T23:00:00.000Z</td>
        </tr>
      </table>
    `;
    const normalized = await createPlugin().normalize({ html });
    assert.ok(normalized.events.some((e) => e.title === 'Jazz Nacht'));
  });

  it('parses month crossing ranges with year from heading', () => {
    const parsed = __test.parseDateTitleLine('31.07. – 02.08. Lenderscheid Kirmes', {
      year: 2026,
      month: 8,
    });
    assert.ok(parsed);
    assert.equal(parsed.startAt, '2026-07-31T00:00:00.000Z');
    assert.equal(parsed.endAt, '2026-08-02T00:00:00.000Z');
    assert.equal(parsed.title, 'Lenderscheid Kirmes');
  });

  it('dedupes the same event found via multiple strategies', async () => {
    const html = `
      <script type="application/ld+json">
      {"@type":"Event","name":"Same Event","startDate":"2026-08-01"}
      </script>
      <ul><li>01.08.2026 Same Event</li></ul>
    `;
    const normalized = await createPlugin().normalize({ html });
    const matches = normalized.events.filter((e) => e.title === 'Same Event');
    assert.equal(matches.length, 1);
  });

  it('detects Toubiz widget and merges EMS API events with static HTML', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          payload: [
            {
              name: 'Toubiz Fest',
              canceled: false,
              dateIntervals: [
                { date: '2026-09-10', startAt: '19:00:00', endAt: '22:00:00', canceled: false },
              ],
            },
          ],
          _links: {},
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    try {
      const html = `
        <toubiz-widget
          route="/event"
          api-token="test-token"
          base-uri="https://mein.toubiz.de"
        ></toubiz-widget>
        <ul><li>01.08.2026 Static Fallback Event</li></ul>
      `;
      const normalized = await createPlugin().normalize({ html });
      assert.ok(normalized.events.some((e) => e.title === 'Toubiz Fest'));
      assert.ok(normalized.events.some((e) => e.title === 'Static Fallback Event'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
