import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  eventEffectiveEnd,
  filterNotExpiredEvents,
  isEventNotExpired,
} from './event-timing.js';

describe('event-timing', () => {
  const now = new Date('2026-08-06T15:00:00.000Z');

  it('keeps upcoming and ongoing events', () => {
    assert.equal(isEventNotExpired('2026-08-10T18:00:00.000Z', null, now), true);
    assert.equal(
      isEventNotExpired('2026-08-06T10:00:00.000Z', '2026-08-06T20:00:00.000Z', now),
      true,
    );
  });

  it('rejects past events', () => {
    assert.equal(isEventNotExpired('2026-08-01T18:00:00.000Z', null, now), false);
    assert.equal(
      isEventNotExpired('2026-08-05T10:00:00.000Z', '2026-08-05T22:00:00.000Z', now),
      false,
    );
  });

  it('uses endAt as effective end when present', () => {
    assert.equal(
      eventEffectiveEnd('2026-08-01T10:00:00.000Z', '2026-08-10T18:00:00.000Z')?.toISOString(),
      '2026-08-10T18:00:00.000Z',
    );
  });

  it('filters lists', () => {
    const kept = filterNotExpiredEvents(
      [
        { title: 'past', startAt: '2026-07-01T00:00:00.000Z' },
        { title: 'future', startAt: '2026-09-01T00:00:00.000Z' },
      ],
      now,
    );
    assert.equal(kept.length, 1);
    assert.equal(kept[0]?.title, 'future');
  });
});
