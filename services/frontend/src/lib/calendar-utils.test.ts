import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addUtcDays,
  alignHeatmapCursor,
  countEventsInMonth,
  groupEventsByDay,
  heatmapSurfaceStyle,
  maxDailyCount,
  shiftCalendarCursor,
  shiftHeatmapCursor,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  startOfUtcWeekend,
  startOfUtcYear,
  toIsoDay,
} from './calendar-utils.js';

describe('calendar-utils', () => {
  it('computes week start on Sunday UTC', () => {
    const wednesday = new Date('2026-08-05T12:00:00.000Z');
    assert.equal(toIsoDay(startOfUtcWeek(wednesday)), '2026-08-02');
  });

  it('aligns weekend window to Friday–Sunday', () => {
    assert.equal(toIsoDay(startOfUtcWeekend(new Date('2026-08-05T12:00:00.000Z'))), '2026-08-07');
    assert.equal(toIsoDay(startOfUtcWeekend(new Date('2026-08-08T12:00:00.000Z'))), '2026-08-07');
    assert.equal(toIsoDay(startOfUtcWeekend(new Date('2026-08-09T12:00:00.000Z'))), '2026-08-07');
    assert.equal(toIsoDay(startOfUtcWeekend(new Date('2026-08-07T12:00:00.000Z'))), '2026-08-07');
  });

  it('shifts classic calendar cursors', () => {
    const day = startOfUtcDay(new Date('2026-08-05T00:00:00.000Z'));
    assert.equal(toIsoDay(shiftCalendarCursor(day, 'day', 1)), '2026-08-06');
    assert.equal(toIsoDay(shiftCalendarCursor(day, 'week', 1)), '2026-08-12');
    assert.equal(toIsoDay(shiftCalendarCursor(startOfUtcMonth(day), 'month', 1)), '2026-09-01');
    assert.equal(toIsoDay(shiftCalendarCursor(startOfUtcYear(day), 'year', 1)), '2027-01-01');
  });

  it('shifts and aligns heatmap cursors including weekend', () => {
    const day = new Date('2026-08-05T00:00:00.000Z');
    assert.equal(toIsoDay(shiftHeatmapCursor(day, 'weekend', 1)), '2026-08-12');
    assert.equal(toIsoDay(alignHeatmapCursor(day, 'weekend')), '2026-08-07');
    assert.equal(toIsoDay(alignHeatmapCursor(day, 'week')), '2026-08-02');
  });

  it('adds UTC days', () => {
    assert.equal(toIsoDay(addUtcDays(new Date('2026-08-05T00:00:00.000Z'), -2)), '2026-08-03');
  });

  it('scales heatmap intensity and counts', () => {
    const byDay = groupEventsByDay([
      { id: '1', startAt: '2026-08-07T10:00:00.000Z' },
      { id: '2', startAt: '2026-08-07T12:00:00.000Z' },
      { id: '3', startAt: '2026-08-08T10:00:00.000Z' },
    ] as never);
    assert.equal(countEventsInMonth(byDay, 2026, 7), 3);
    assert.equal(maxDailyCount(byDay, [new Date('2026-08-07T00:00:00.000Z')]), 2);
    assert.deepEqual(heatmapSurfaceStyle(0, 2), {});
    assert.ok(heatmapSurfaceStyle(2, 2).backgroundColor?.includes('82%'));
  });
});
