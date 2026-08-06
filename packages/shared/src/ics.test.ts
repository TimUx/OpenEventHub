import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCalendarIcs,
  buildEventIcs,
  calendarFeedFilename,
  escapeIcsText,
  eventIcsFilename,
  toIcsUtc,
  toWebcalUrl,
} from './ics.js';

describe('ics', () => {
  it('formats UTC ICS timestamps', () => {
    assert.equal(toIcsUtc('2026-08-15T18:00:00.000Z'), '20260815T180000Z');
  });

  it('escapes ICS text special characters', () => {
    assert.equal(escapeIcsText('A;B,C\\D\nE'), 'A\\;B\\,C\\\\D\\nE');
  });

  it('builds a single-event calendar', () => {
    const ics = buildEventIcs(
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        slug: 'jazz-nacht',
        title: 'Jazz Nacht; Live',
        summary: 'Open Air',
        startAt: '2026-08-15T18:00:00.000Z',
        endAt: '2026-08-15T22:00:00.000Z',
        venue: { name: 'Olympiapark', address: 'Spiridon-Louis-Ring 21', city: 'München' },
      },
      'https://example.test/events/jazz-nacht',
    );
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /UID:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@openeventhub/);
    assert.match(ics, /DTSTART:20260815T180000Z/);
    assert.match(ics, /DTEND:20260815T220000Z/);
    assert.match(ics, /SUMMARY:Jazz Nacht\\; Live/);
    assert.match(ics, /LOCATION:Olympiapark\\, Spiridon-Louis-Ring 21\\, München/);
    assert.match(ics, /URL:https:\/\/example\.test\/events\/jazz-nacht/);
    assert.match(ics, /END:VEVENT/);
  });

  it('builds a multi-event feed with calendar name', () => {
    const ics = buildCalendarIcs(
      [
        {
          id: '1',
          title: 'A',
          startAt: '2026-08-15T18:00:00.000Z',
        },
        {
          id: '2',
          title: 'B',
          startAt: '2026-08-16T18:00:00.000Z',
        },
      ],
      {
        calendarName: 'OpenEventHub',
        eventUrl: (event) => `https://example.test/events/${event.id}`,
      },
    );
    assert.match(ics, /X-WR-CALNAME:OpenEventHub/);
    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 2);
  });

  it('defaults DTEND to start + 2h when endAt is missing', () => {
    const ics = buildEventIcs(
      { id: 'x', title: 'T', startAt: '2026-08-15T18:00:00.000Z' },
      'https://example.test/e',
    );
    assert.match(ics, /DTEND:20260815T200000Z/);
  });

  it('uses slug for ICS filename and maps webcal URLs', () => {
    assert.equal(eventIcsFilename({ id: 'x', slug: 'jazz-nacht' }), 'jazz-nacht.ics');
    assert.equal(calendarFeedFilename(), 'openeventhub.ics');
    assert.equal(
      toWebcalUrl('https://example.test/calendar.ics'),
      'webcal://example.test/calendar.ics',
    );
  });
});
