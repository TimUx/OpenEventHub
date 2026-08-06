import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inferAllDay, temporalHasClockTime } from './temporal-all-day.js';

describe('temporal-all-day', () => {
  it('treats date-only and UTC midnight as no clock time', () => {
    assert.equal(temporalHasClockTime('2026-09-01'), false);
    assert.equal(temporalHasClockTime('2026-09-01T00:00:00.000Z'), false);
    assert.equal(temporalHasClockTime('20260901'), false);
    assert.equal(temporalHasClockTime('20260901T000000Z'), false);
  });

  it('detects real clock times', () => {
    assert.equal(temporalHasClockTime('2026-09-01T18:30:00.000Z'), true);
    assert.equal(temporalHasClockTime('20260901T193000Z'), true);
    assert.equal(temporalHasClockTime('Wed, 01 Oct 2026 12:00:00 GMT'), true);
  });

  it('infers allDay for brewery-style date listings', () => {
    assert.equal(inferAllDay('2026-09-01T00:00:00.000Z', '2026-09-02T00:00:00.000Z'), true);
    assert.equal(inferAllDay('2026-09-01T19:00:00.000Z', null), false);
  });
});
