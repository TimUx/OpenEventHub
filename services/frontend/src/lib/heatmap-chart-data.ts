import {
  addUtcDays,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  startOfUtcWeekend,
  toIsoDay,
  type HeatmapViewMode,
} from './calendar-utils';

export type HeatmapDatum = readonly [string, number];

export function calendarRangeForMode(
  mode: HeatmapViewMode,
  cursor: Date,
): string | [string, string] {
  if (mode === 'year') {
    return String(cursor.getUTCFullYear());
  }
  if (mode === 'month') {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  if (mode === 'week') {
    const start = startOfUtcWeek(cursor);
    return [toIsoDay(start), toIsoDay(addUtcDays(start, 6))];
  }
  if (mode === 'weekend') {
    const start = startOfUtcWeekend(cursor);
    return [toIsoDay(start), toIsoDay(addUtcDays(start, 2))];
  }
  const day = startOfUtcDay(cursor);
  return [toIsoDay(day), toIsoDay(day)];
}

export function enumerateUtcDays(fromIso: string, toIso: string): string[] {
  const days: string[] = [];
  let cursor = startOfUtcDay(new Date(`${fromIso}T00:00:00.000Z`));
  const end = startOfUtcDay(new Date(`${toIso}T00:00:00.000Z`));
  while (cursor.getTime() <= end.getTime()) {
    days.push(toIsoDay(cursor));
    cursor = addUtcDays(cursor, 1);
  }
  return days;
}

export function resolveRangeBounds(range: string | [string, string]): {
  readonly from: string;
  readonly to: string;
} {
  if (typeof range === 'string') {
    if (/^\d{4}$/.test(range)) {
      return { from: `${range}-01-01`, to: `${range}-12-31` };
    }
    if (/^\d{4}-\d{2}$/.test(range)) {
      const [y, m] = range.split('-').map(Number) as [number, number];
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return {
        from: `${range}-01`,
        to: `${range}-${String(last).padStart(2, '0')}`,
      };
    }
    return { from: range, to: range };
  }
  return { from: range[0], to: range[1] };
}

/** Dense daily series for ECharts calendar heatmap (`['YYYY-MM-DD', count]`). */
export function buildDailyHeatmapData(
  eventsByDay: ReadonlyMap<string, { readonly length: number }>,
  range: string | [string, string],
): { readonly data: HeatmapDatum[]; readonly max: number } {
  const { from, to } = resolveRangeBounds(range);
  const data: HeatmapDatum[] = [];
  let max = 0;
  for (const day of enumerateUtcDays(from, to)) {
    const count = eventsByDay.get(day)?.length ?? 0;
    data.push([day, count]);
    max = Math.max(max, count);
  }
  return { data, max };
}

export function chartHeightForMode(mode: HeatmapViewMode): number {
  if (mode === 'year') return 240;
  if (mode === 'month') return 320;
  if (mode === 'week' || mode === 'weekend') return 220;
  return 180;
}

/** Next drill mode when clicking a cell in the current zoom. */
export function drillModeAfterClick(mode: HeatmapViewMode): HeatmapViewMode {
  if (mode === 'year') return 'month';
  if (mode === 'month') return 'week';
  if (mode === 'week') return 'weekend';
  if (mode === 'weekend') return 'day';
  return 'day';
}

export function cursorAfterHeatmapClick(isoDay: string, nextMode: HeatmapViewMode): Date {
  const day = startOfUtcDay(new Date(`${isoDay}T00:00:00.000Z`));
  if (nextMode === 'month') return startOfUtcMonth(day);
  if (nextMode === 'week') return startOfUtcWeek(day);
  if (nextMode === 'weekend') return startOfUtcWeekend(day);
  return day;
}
