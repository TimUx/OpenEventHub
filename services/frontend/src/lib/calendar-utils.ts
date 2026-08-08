import type { ApiEvent } from './api';

/** Classic calendar modes (unchanged product surface). */
export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

/** Density heatmap zoom ladder. */
export type HeatmapViewMode = 'year' | 'month' | 'week' | 'weekend' | 'day';

export const HEATMAP_VIEW_MODES: readonly HeatmapViewMode[] = [
  'year',
  'month',
  'week',
  'weekend',
  'day',
] as const;

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function startOfUtcWeek(date: Date): Date {
  const day = startOfUtcDay(date);
  // Sunday-based week to match existing month grid
  return addUtcDays(day, -day.getUTCDay());
}

/** Friday of the Fri–Sun weekend window that contains `date`. */
export function startOfUtcWeekend(date: Date): Date {
  const day = startOfUtcDay(date);
  const dow = day.getUTCDay(); // 0=Sun … 5=Fri 6=Sat
  if (dow === 5) return day;
  if (dow === 6) return addUtcDays(day, -1);
  if (dow === 0) return addUtcDays(day, -2);
  return addUtcDays(day, 5 - dow);
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function groupEventsByDay(events: readonly ApiEvent[]): Map<string, ApiEvent[]> {
  const map = new Map<string, ApiEvent[]>();
  for (const event of events) {
    const key = event.startAt.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  return map;
}

export function eventsOnDay(eventsByDay: Map<string, ApiEvent[]>, date: Date): ApiEvent[] {
  return eventsByDay.get(toIsoDay(date)) ?? [];
}

export function countEventsOnDay(eventsByDay: Map<string, ApiEvent[]>, date: Date): number {
  return eventsOnDay(eventsByDay, date).length;
}

export function countEventsInMonth(
  eventsByDay: Map<string, ApiEvent[]>,
  year: number,
  monthIndex: number,
): number {
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    count += countEventsOnDay(eventsByDay, new Date(Date.UTC(year, monthIndex, day)));
  }
  return count;
}

/** Max daily count across a set of dates (for heatmap scaling). */
export function maxDailyCount(
  eventsByDay: Map<string, ApiEvent[]>,
  dates: readonly Date[],
): number {
  let max = 0;
  for (const date of dates) {
    max = Math.max(max, countEventsOnDay(eventsByDay, date));
  }
  return max;
}

/**
 * Heatmap fill using theme primary mixed into the card surface.
 * `count` 0 = empty; higher vs `maxCount` = stronger primary mix.
 */
export function heatmapSurfaceStyle(
  count: number,
  maxCount: number,
): { readonly backgroundColor?: string } {
  if (count <= 0 || maxCount <= 0) {
    return {};
  }
  const t = Math.min(1, count / maxCount);
  const pct = Math.round(10 + t * 72);
  return {
    backgroundColor: `color-mix(in srgb, var(--primary) ${pct}%, var(--card))`,
  };
}

export function monthCells(cursor: Date): Array<{ day: number | null; date?: Date }> {
  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: Array<{ day: number | null; date?: Date }> = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({ day: null });
  }
  for (let day = 1; day <= total; day += 1) {
    cells.push({ day, date: new Date(Date.UTC(year, month, day)) });
  }
  return cells;
}

export function shiftCalendarCursor(cursor: Date, mode: CalendarViewMode, delta: number): Date {
  if (mode === 'day') {
    return addUtcDays(startOfUtcDay(cursor), delta);
  }
  if (mode === 'week') {
    return addUtcDays(startOfUtcDay(cursor), delta * 7);
  }
  if (mode === 'year') {
    return new Date(Date.UTC(cursor.getUTCFullYear() + delta, 0, 1));
  }
  return new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + delta, 1));
}

export function shiftHeatmapCursor(cursor: Date, mode: HeatmapViewMode, delta: number): Date {
  if (mode === 'day') {
    return addUtcDays(startOfUtcDay(cursor), delta);
  }
  if (mode === 'week' || mode === 'weekend') {
    return addUtcDays(startOfUtcDay(cursor), delta * 7);
  }
  if (mode === 'year') {
    return new Date(Date.UTC(cursor.getUTCFullYear() + delta, 0, 1));
  }
  return new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + delta, 1));
}

export function alignHeatmapCursor(cursor: Date, mode: HeatmapViewMode): Date {
  if (mode === 'month') return startOfUtcMonth(cursor);
  if (mode === 'week') return startOfUtcWeek(cursor);
  if (mode === 'weekend') return startOfUtcWeekend(cursor);
  if (mode === 'year') return startOfUtcYear(cursor);
  return startOfUtcDay(cursor);
}
