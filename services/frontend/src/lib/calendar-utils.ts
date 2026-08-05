import type { ApiEvent } from '../lib/api';

export type CalendarViewMode = 'day' | 'week' | 'month' | 'year';

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
