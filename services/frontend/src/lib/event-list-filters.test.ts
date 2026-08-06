import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApiEvent } from './api.js';
import {
  applyEventListFilters,
  DEFAULT_EVENT_LIST_FILTERS,
  eventListFiltersActive,
  filterListEvents,
  sortListEvents,
} from './event-list-filters.js';

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

describe('event-list-filters', () => {
  const sample = [
    event({
      id: 'a',
      title: 'Jazz Nacht',
      startAt: '2026-09-12T18:00:00.000Z',
      categories: [{ id: 'c1', name: 'Konzerte', slug: 'music' }],
      venue: {
        id: 'v1',
        name: 'Gasteig',
        slug: 'gasteig',
        address: null,
        city: 'München',
        regionId: 'muenchen',
        latitude: null,
        longitude: null,
      },
    }),
    event({
      id: 'b',
      title: 'Sommerlauf',
      startAt: '2026-08-23T09:00:00.000Z',
      categories: [{ id: 'c2', name: 'Sport', slug: 'sports' }],
      venue: {
        id: 'v2',
        name: 'Olympiapark',
        slug: 'olympiapark',
        address: null,
        city: 'München',
        regionId: 'muenchen',
        latitude: null,
        longitude: null,
      },
    }),
    event({
      id: 'c',
      title: 'Open Air Berlin',
      startAt: '2026-08-30T16:00:00.000Z',
      categories: [{ id: 'c1', name: 'Konzerte', slug: 'music' }],
      venue: {
        id: 'v3',
        name: 'Tempelhof',
        slug: 'tempelhof',
        address: null,
        city: 'Berlin',
        regionId: 'berlin',
        latitude: null,
        longitude: null,
      },
    }),
  ];

  it('filters by category, region and date range', () => {
    assert.equal(filterListEvents(sample, { category: 'sports' }).length, 1);
    assert.equal(filterListEvents(sample, { regionId: 'berlin' })[0]?.id, 'c');
    assert.deepEqual(
      filterListEvents(sample, { dateFrom: '2026-08-23', dateTo: '2026-08-30' }).map((e) => e.id),
      ['b', 'c'],
    );
  });

  it('sorts by start date and title', () => {
    assert.deepEqual(
      sortListEvents(sample, 'startAt', 'asc').map((e) => e.id),
      ['b', 'c', 'a'],
    );
    assert.deepEqual(
      sortListEvents(sample, 'startAt', 'desc').map((e) => e.id),
      ['a', 'c', 'b'],
    );
    assert.equal(sortListEvents(sample, 'title', 'asc')[0]?.id, 'a');
    assert.equal(sortListEvents(sample, 'title', 'desc')[0]?.id, 'b');
  });

  it('applies filter then sort and detects active filters', () => {
    const result = applyEventListFilters(sample, {
      ...DEFAULT_EVENT_LIST_FILTERS,
      category: 'music',
      sortBy: 'startAt',
      sortDir: 'asc',
    });
    assert.deepEqual(
      result.map((e) => e.id),
      ['c', 'a'],
    );
    assert.equal(eventListFiltersActive(DEFAULT_EVENT_LIST_FILTERS), false);
    assert.equal(
      eventListFiltersActive({ ...DEFAULT_EVENT_LIST_FILTERS, dateFrom: '2026-01-01' }),
      true,
    );
  });
});
