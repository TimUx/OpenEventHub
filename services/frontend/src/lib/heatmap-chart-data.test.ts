import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDailyHeatmapData,
  calendarRangeForMode,
  drillModeAfterClick,
  resolveRangeBounds,
} from './heatmap-chart-data.js';

describe('heatmap-chart-data', () => {
  it('builds calendar ranges per zoom mode', () => {
    const cursor = new Date('2026-08-05T00:00:00.000Z');
    assert.equal(calendarRangeForMode('year', cursor), '2026');
    assert.equal(calendarRangeForMode('month', cursor), '2026-08');
    assert.deepEqual(calendarRangeForMode('week', cursor), ['2026-08-02', '2026-08-08']);
    assert.deepEqual(calendarRangeForMode('weekend', cursor), ['2026-08-07', '2026-08-09']);
    assert.deepEqual(calendarRangeForMode('day', cursor), ['2026-08-05', '2026-08-05']);
  });

  it('resolves year and month bounds', () => {
    assert.deepEqual(resolveRangeBounds('2026'), { from: '2026-01-01', to: '2026-12-31' });
    assert.deepEqual(resolveRangeBounds('2026-02'), { from: '2026-02-01', to: '2026-02-28' });
  });

  it('builds dense daily heatmap series', () => {
    const byDay = new Map<string, { length: number }>([
      ['2026-08-07', { length: 2 }],
      ['2026-08-08', { length: 1 }],
    ]);
    const { data, max } = buildDailyHeatmapData(byDay, ['2026-08-07', '2026-08-09']);
    assert.equal(max, 2);
    assert.deepEqual(data, [
      ['2026-08-07', 2],
      ['2026-08-08', 1],
      ['2026-08-09', 0],
    ]);
  });

  it('drills year → month → week → weekend → day', () => {
    assert.equal(drillModeAfterClick('year'), 'month');
    assert.equal(drillModeAfterClick('month'), 'week');
    assert.equal(drillModeAfterClick('week'), 'weekend');
    assert.equal(drillModeAfterClick('weekend'), 'day');
  });
});
