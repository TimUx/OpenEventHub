import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApiEvent } from './api.js';
import { eventHasCoordinates, filterMapEvents, getEventCoordinates } from './map-events.js';

function event(partial: Partial<ApiEvent> & Pick<ApiEvent, 'id' | 'title'>): ApiEvent {
  return {
    slug: partial.slug ?? partial.id,
    summary: partial.summary ?? null,
    description: partial.description ?? null,
    startAt: partial.startAt ?? '2026-09-01T10:00:00.000Z',
    endAt: partial.endAt ?? null,
    status: partial.status ?? 'published',
    venueId: partial.venueId ?? null,
    organizerId: partial.organizerId ?? null,
    venue: partial.venue ?? null,
    categories: partial.categories ?? [],
    ...partial,
  };
}

describe('map-events', () => {
  it('reads venue coordinates', () => {
    const withCoords = event({
      id: '1',
      title: 'Jazz',
      venue: {
        id: 'v1',
        name: 'Gasteig',
        slug: 'gasteig',
        address: null,
        city: 'München',
        regionId: 'r1',
        latitude: 48.11,
        longitude: 11.55,
      },
    });
    assert.deepEqual(getEventCoordinates(withCoords), { latitude: 48.11, longitude: 11.55 });
    assert.equal(eventHasCoordinates(withCoords), true);
    assert.equal(eventHasCoordinates(event({ id: '2', title: 'No venue' })), false);
  });

  it('filters by query, category, region and date', () => {
    const events = [
      event({
        id: 'a',
        title: 'Jazz Nacht',
        startAt: '2026-09-12T18:00:00.000Z',
        categories: [{ id: 'c1', name: 'Konzerte', slug: 'music-concerts' }],
        venue: {
          id: 'v1',
          name: 'Gasteig HP8',
          slug: 'gasteig-hp8',
          address: null,
          city: 'München',
          regionId: 'muenchen',
          latitude: 48.11,
          longitude: 11.55,
        },
      }),
      event({
        id: 'b',
        title: 'Sommerlauf',
        startAt: '2026-08-23T09:00:00.000Z',
        categories: [{ id: 'c2', name: 'Laufsport', slug: 'sports-running' }],
        venue: {
          id: 'v2',
          name: 'Olympiapark',
          slug: 'olympiapark',
          address: null,
          city: 'München',
          regionId: 'muenchen',
          latitude: 48.17,
          longitude: 11.55,
        },
      }),
    ];

    assert.equal(filterMapEvents(events, { query: 'jazz' }).length, 1);
    assert.equal(filterMapEvents(events, { category: 'sports-running' })[0]?.id, 'b');
    assert.equal(filterMapEvents(events, { regionId: 'muenchen' }).length, 2);
    assert.equal(filterMapEvents(events, { date: '2026-08-23' })[0]?.id, 'b');
    assert.equal(filterMapEvents(events, { query: 'xyz' }).length, 0);
  });
});
