import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApiEvent } from './api.js';
import {
  buildEventIcs,
  buildEventMapHref,
  canShowEventOnMap,
  escapeIcsText,
  eventIcsFilename,
  toIcsUtc,
} from './event-calendar.js';

const baseEvent: ApiEvent = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  slug: 'jazz-nacht',
  title: 'Jazz Nacht; Live',
  summary: 'Line-up,\nStage A',
  description: null,
  startAt: '2026-08-15T18:00:00.000Z',
  endAt: '2026-08-15T22:00:00.000Z',
  status: 'PUBLISHED',
  venue: {
    id: 'venue-1',
    name: 'Olympiapark',
    slug: 'olympiapark',
    address: 'Spiridon-Louis-Ring 21',
    city: 'München',
    regionId: 'region-1',
    latitude: 48.175,
    longitude: 11.55,
  },
};

describe('event-calendar', () => {
  it('formats UTC ICS timestamps', () => {
    assert.equal(toIcsUtc('2026-08-15T18:00:00.000Z'), '20260815T180000Z');
  });

  it('escapes ICS text special characters', () => {
    assert.equal(escapeIcsText('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne');
  });

  it('builds map deep links', () => {
    assert.equal(buildEventMapHref(baseEvent.id), `/map?event=${baseEvent.id}`);
  });

  it('detects map availability from venue coordinates', () => {
    assert.equal(canShowEventOnMap(baseEvent), true);
    assert.equal(
      canShowEventOnMap({
        ...baseEvent,
        venue: { ...baseEvent.venue!, latitude: null, longitude: null },
      }),
      false,
    );
  });

  it('builds a downloadable VEVENT document', () => {
    const ics = buildEventIcs(baseEvent, 'https://example.test/events/jazz-nacht');
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

  it('defaults DTEND to start + 2h when endAt is missing', () => {
    const ics = buildEventIcs(
      { ...baseEvent, endAt: null },
      'https://example.test/events/jazz-nacht',
    );
    assert.match(ics, /DTEND:20260815T200000Z/);
  });

  it('uses slug for ICS filename', () => {
    assert.equal(eventIcsFilename(baseEvent), 'jazz-nacht.ics');
  });
});
