'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, CalendarRange, Calendar as CalendarIcon, Grid2x2 } from 'lucide-react';
import { intlLocale } from '@openeventhub/shared';

import { usePersistedViewMode } from '../hooks/use-persisted-view-mode';
import { useI18n } from '../i18n/i18n-provider';
import {
  addUtcDays,
  eventsOnDay,
  groupEventsByDay,
  monthCells,
  shiftCalendarCursor,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
  startOfUtcYear,
  toIsoDay,
  type CalendarViewMode,
} from '../lib/calendar-utils';
import { formatEventDate, getPublicApiBase, type ApiEvent } from '../lib/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CalendarExportBar } from './calendar-export-bar';
import { ViewModeToggle } from './view-mode-toggle';

const CALENDAR_MODES: CalendarViewMode[] = ['day', 'week', 'month', 'year'];

async function fetchEvents(errorMessage: string): Promise<ApiEvent[]> {
  const response = await fetch(`${getPublicApiBase()}/api/v1/events?limit=100`);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return (await response.json()) as ApiEvent[];
}

function useCursorDate(): [Date, (date: Date) => void] {
  const [cursor, setCursor] = useState(() => startOfUtcDay(new Date()));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('oeh_view_calendar_focus');
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        setCursor(startOfUtcDay(new Date(`${stored}T00:00:00.000Z`)));
      }
    } catch {
      // ignore
    }
  }, []);

  function update(next: Date): void {
    const day = startOfUtcDay(next);
    setCursor(day);
    try {
      window.localStorage.setItem('oeh_view_calendar_focus', toIsoDay(day));
    } catch {
      // ignore
    }
  }

  return [cursor, update];
}

function EventChip({ event, locale }: { readonly event: ApiEvent; readonly locale: 'de' | 'en' }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="block truncate rounded px-1 py-0.5 text-xs text-primary hover:bg-primary-soft dark:text-primary-bright"
      title={`${event.title} · ${formatEventDate(event.startAt, locale, { allDay: Boolean(event.allDay) })}`}
    >
      {event.title}
    </Link>
  );
}

export function CalendarBrowser() {
  const { t, locale, dictionary } = useI18n();
  const [mode, setMode] = usePersistedViewMode<CalendarViewMode>(
    'calendar',
    'month',
    CALENDAR_MODES,
  );
  const [cursor, setCursor] = useCursorDate();

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['events', 'calendar'],
    queryFn: () => fetchEvents(t('calendar.error')),
  });

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events]);

  const label = useMemo(() => {
    const tag = intlLocale(locale);
    if (mode === 'day') {
      return new Intl.DateTimeFormat(tag, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(cursor);
    }
    if (mode === 'week') {
      const start = startOfUtcWeek(cursor);
      const end = addUtcDays(start, 6);
      const fmt = new Intl.DateTimeFormat(tag, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return `${fmt.format(start)} – ${fmt.format(end)}`;
    }
    if (mode === 'year') {
      return new Intl.DateTimeFormat(tag, { year: 'numeric', timeZone: 'UTC' }).format(cursor);
    }
    return new Intl.DateTimeFormat(tag, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(cursor);
  }, [cursor, locale, mode]);

  function changeMode(next: CalendarViewMode): void {
    setMode(next);
    if (next === 'month') setCursor(startOfUtcMonth(cursor));
    else if (next === 'week') setCursor(startOfUtcWeek(cursor));
    else if (next === 'year') setCursor(startOfUtcYear(cursor));
    else setCursor(startOfUtcDay(cursor));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl">{t('calendar.title')}</h1>
          <p className="text-[var(--muted)]">{t('calendar.description')}</p>
          <p className="text-sm text-[var(--muted)]">
            <Link href="/heatmap" className="font-semibold text-primary hover:underline">
              {t('calendar.toHeatmap')}
            </Link>
          </p>
        </div>
        <ViewModeToggle
          label={t('calendar.viewMode')}
          value={mode}
          onChange={changeMode}
          options={[
            {
              value: 'day',
              label: t('calendar.viewDay'),
              icon: <CalendarIcon className="h-3.5 w-3.5" />,
            },
            {
              value: 'week',
              label: t('calendar.viewWeek'),
              icon: <CalendarRange className="h-3.5 w-3.5" />,
            },
            {
              value: 'month',
              label: t('calendar.viewMonth'),
              icon: <CalendarDays className="h-3.5 w-3.5" />,
            },
            {
              value: 'year',
              label: t('calendar.viewYear'),
              icon: <Grid2x2 className="h-3.5 w-3.5" />,
            },
          ]}
        />
      </header>

      <CalendarExportBar events={events} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setCursor(shiftCalendarCursor(cursor, mode, -1))}
          >
            {t('calendar.previous')}
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium sm:text-base">
            {label}
          </span>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setCursor(shiftCalendarCursor(cursor, mode, 1))}
          >
            {t('calendar.next')}
          </Button>
        </div>
        <Button type="button" variant="ghost" onClick={() => setCursor(startOfUtcDay(new Date()))}>
          {t('calendar.today')}
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-[var(--muted)]">{t('calendar.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{t('calendar.error')}</p> : null}

      {mode === 'day' ? (
        <DayView
          date={cursor}
          events={eventsOnDay(eventsByDay, cursor)}
          locale={locale}
          empty={t('calendar.noEvents')}
        />
      ) : null}

      {mode === 'week' ? (
        <div className="grid gap-2 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, index) => {
            const day = addUtcDays(startOfUtcWeek(cursor), index);
            const dayEvents = eventsOnDay(eventsByDay, day);
            return (
              <Card key={toIsoDay(day)} className="min-h-40 p-2 shadow-none">
                <button
                  type="button"
                  className="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)] hover:text-primary"
                  onClick={() => {
                    setMode('day');
                    setCursor(day);
                  }}
                >
                  {dictionary.calendar.weekdays[index]} {day.getUTCDate()}
                </button>
                <ul className="space-y-1">
                  {dayEvents.map((event) => (
                    <li key={event.id}>
                      <EventChip event={event} locale={locale} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      ) : null}

      {mode === 'month' ? (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-[var(--muted)] sm:gap-2 sm:text-xs">
            {dictionary.calendar.weekdays.map((d) => (
              <div key={d} className="truncate">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {monthCells(cursor).map((cell, index) => {
              const dayEvents = cell.date ? eventsOnDay(eventsByDay, cell.date) : [];
              return (
                <Card
                  key={`${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}-${index}`}
                  className="min-h-14 p-1 text-left shadow-none sm:min-h-24 sm:p-2"
                >
                  {cell.day && cell.date ? (
                    <>
                      <button
                        type="button"
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-xs font-semibold hover:bg-primary-soft hover:text-primary sm:min-h-0 sm:min-w-0"
                        onClick={() => {
                          setMode('day');
                          setCursor(cell.date!);
                        }}
                      >
                        {cell.day}
                      </button>
                      <ul className="mt-0.5 hidden space-y-1 sm:mt-1 sm:block">
                        {dayEvents.slice(0, 3).map((event) => (
                          <li key={event.id}>
                            <EventChip event={event} locale={locale} />
                          </li>
                        ))}
                        {dayEvents.length > 3 ? (
                          <li className="text-[10px] text-[var(--muted)]">
                            +{dayEvents.length - 3}
                          </li>
                        ) : null}
                      </ul>
                      {dayEvents.length > 0 ? (
                        <p className="mt-0.5 text-[10px] font-semibold text-primary sm:hidden">
                          {dayEvents.length}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      {mode === 'year' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, month) => {
            const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), month, 1));
            const name = new Intl.DateTimeFormat(intlLocale(locale), {
              month: 'long',
              timeZone: 'UTC',
            }).format(monthStart);
            const daysInMonth = new Date(
              Date.UTC(cursor.getUTCFullYear(), month + 1, 0),
            ).getUTCDate();
            let count = 0;
            for (let day = 1; day <= daysInMonth; day += 1) {
              count += eventsOnDay(
                eventsByDay,
                new Date(Date.UTC(cursor.getUTCFullYear(), month, day)),
              ).length;
            }
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setMode('month');
                  setCursor(startOfUtcMonth(monthStart));
                }}
                className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:bg-primary-soft"
              >
                <p className="font-bold text-lg">{name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t('calendar.eventsCount', { count })}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function DayView({
  date,
  events,
  locale,
  empty,
}: {
  readonly date: Date;
  readonly events: readonly ApiEvent[];
  readonly locale: 'de' | 'en';
  readonly empty: string;
}) {
  return (
    <Card className="space-y-3 p-5">
      <p className="text-sm text-[var(--muted)]">{toIsoDay(date)}</p>
      {events.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="border-b border-[var(--border)] pb-3 last:border-0">
              <Link href={`/events/${event.id}`} className="font-bold text-xl hover:text-primary">
                {event.title}
              </Link>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {formatEventDate(event.startAt, locale, { allDay: Boolean(event.allDay) })}
              </p>
              {event.summary ? <p className="mt-1 text-sm">{event.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
