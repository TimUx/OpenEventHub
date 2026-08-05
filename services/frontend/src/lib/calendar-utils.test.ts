import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addUtcDays,
  shiftCalendarCursor,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  startOfUtcYear,
  toIsoDay,
} from './calendar-utils.js';

describe('calendar-utils', () => {
  it('computes week start on Sunday UTC', () => {
    const wednesday = new Date('2026-08-05T12:00:00.000Z');
    assert.equal(toIsoDay(startOfUtcWeek(wednesday)), '2026-08-02');
  });

  it('shifts cursors by view mode', () => {
    const day = startOfUtcDay(new Date('2026-08-05T00:00:00.000Z'));
    assert.equal(toIsoDay(shiftCalendarCursor(day, 'day', 1)), '2026-08-06');
    assert.equal(toIsoDay(shiftCalendarCursor(day, 'week', 1)), '2026-08-12');
    assert.equal(toIsoDay(shiftCalendarCursor(startOfUtcMonth(day), 'month', 1)), '2026-09-01');
    assert.equal(toIsoDay(shiftCalendarCursor(startOfUtcYear(day), 'year', 1)), '2027-01-01');
  });

  it('adds UTC days', () => {
    assert.equal(toIsoDay(addUtcDays(new Date('2026-08-05T00:00:00.000Z'), -2)), '2026-08-03');
  });
});
