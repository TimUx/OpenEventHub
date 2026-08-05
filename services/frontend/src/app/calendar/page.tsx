'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { formatEventDate, getPublicApiBase, type ApiEvent } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

async function fetchEvents(): Promise<ApiEvent[]> {
  const response = await fetch(`${getPublicApiBase()}/api/v1/events?limit=100`);
  if (!response.ok) {
    throw new Error('Failed to load events');
  }
  return (await response.json()) as ApiEvent[];
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', 'calendar'],
    queryFn: fetchEvents,
  });

  const daysInMonth = useMemo(() => {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const cells: Array<{ day: number | null; dateIso?: string }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ day: null });
    }
    for (let day = 1; day <= total; day += 1) {
      const iso = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
      cells.push({ day, dateIso: iso });
    }
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ApiEvent[]>();
    for (const event of events) {
      const key = event.startAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const label = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(cursor);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Calendar</h1>
          <p className="text-[var(--muted)]">Month view of published events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCursor(
                new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1)),
              )
            }
          >
            Previous
          </Button>
          <span className="min-w-36 text-center font-medium">{label}</span>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setCursor(
                new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)),
              )
            }
          >
            Next
          </Button>
        </div>
      </header>

      {isLoading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">Could not load calendar events.</p> : null}

      <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-wide text-[var(--muted)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map((cell, index) => {
          const dayEvents = cell.dateIso ? (eventsByDay.get(cell.dateIso) ?? []) : [];
          return (
            <Card
              key={`${monthKey(cursor)}-${index}`}
              className="min-h-24 p-2 text-left shadow-none"
            >
              {cell.day ? (
                <>
                  <div className="text-xs font-semibold">{cell.day}</div>
                  <ul className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <li key={event.id}>
                        <Link
                          href={`/events/${event.id}`}
                          className="block truncate text-xs text-teal dark:text-teal-bright"
                          title={`${event.title} · ${formatEventDate(event.startAt)}`}
                        >
                          {event.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
