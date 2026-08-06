import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filterNotExpiredEvents, isEventNotExpired } from '../utils/is-future-event.js';

describe('is-future-event util', () => {
  const now = new Date('2026-08-06T15:00:00.000Z');

  it('filters past rss-style candidates', () => {
    const events = filterNotExpiredEvents(
      [
        { isEvent: true, title: 'Old', startAt: '2026-01-01T00:00:00.000Z', endAt: null },
        { isEvent: true, title: 'New', startAt: '2026-12-01T00:00:00.000Z', endAt: null },
      ],
      now,
    );
    assert.equal(events.length, 1);
    assert.equal(events[0]?.title, 'New');
  });

  it('keeps ongoing multi-day events', () => {
    assert.equal(
      isEventNotExpired('2026-08-01T00:00:00.000Z', '2026-08-10T23:00:00.000Z', now),
      true,
    );
  });
});
