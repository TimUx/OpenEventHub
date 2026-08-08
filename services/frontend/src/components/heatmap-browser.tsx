'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarRange,
  Calendar as CalendarIcon,
  Grid2x2,
  PartyPopper,
} from 'lucide-react';
import { intlLocale } from '@openeventhub/shared';

import { usePersistedViewMode } from '../hooks/use-persisted-view-mode';
import { useI18n } from '../i18n/i18n-provider';
import {
  calendarRangeForMode,
  cursorAfterHeatmapClick,
  drillModeAfterClick,
  eventsInIsoRange,
  resolveRangeBounds,
  showHeatmapPeriodList,
} from '../lib/heatmap-chart-data';
import { filterListEvents } from '../lib/event-list-filters';
import {
  formatEventDate,
  getPublicApiBase,
  listCategories,
  listRegions,
  type ApiEvent,
} from '../lib/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RegionFilter } from './region-filter';
import { ViewModeToggle } from './view-mode-toggle';
import {
  alignHeatmapCursor,
  groupEventsByDay,
  HEATMAP_VIEW_MODES,
  shiftHeatmapCursor,
  startOfUtcDay,
  toIsoDay,
  type HeatmapViewMode,
} from '../lib/calendar-utils';

const EventDensityHeatmap = dynamic(() => import('./event-density-heatmap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(50dvh,520px)] min-h-80 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted)]">
      …
    </div>
  ),
});

async function fetchEvents(errorMessage: string): Promise<ApiEvent[]> {
  const response = await fetch(`${getPublicApiBase()}/api/v1/events?limit=100`);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return (await response.json()) as ApiEvent[];
}

function useCursorDate(storageKey: string): [Date, (date: Date) => void] {
  const [cursor, setCursor] = useState(() => startOfUtcDay(new Date()));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
        setCursor(startOfUtcDay(new Date(`${stored}T00:00:00.000Z`)));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  function update(next: Date): void {
    const day = startOfUtcDay(next);
    setCursor(day);
    try {
      window.localStorage.setItem(storageKey, toIsoDay(day));
    } catch {
      // ignore
    }
  }

  return [cursor, update];
}

export function HeatmapBrowser() {
  const { t, locale } = useI18n();
  const [mode, setMode] = usePersistedViewMode<HeatmapViewMode>(
    'heatmap',
    'month',
    HEATMAP_VIEW_MODES,
  );
  const [cursor, setCursor] = useCursorDate('oeh_view_heatmap_focus');
  const [category, setCategory] = useState('');
  const [regionId, setRegionId] = useState('');

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['events', 'heatmap'],
    queryFn: () => fetchEvents(t('heatmap.error')),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: listRegions,
  });

  const filteredEvents = useMemo(
    () => filterListEvents(events, { category, regionId, dateFrom: '', dateTo: '' }),
    [events, category, regionId],
  );

  const eventsByDay = useMemo(() => groupEventsByDay(filteredEvents), [filteredEvents]);
  const filtersActive = Boolean(category || regionId);

  const label = useMemo(() => {
    const tag = intlLocale(locale);
    const range = calendarRangeForMode(mode, cursor);
    const { from, to } = resolveRangeBounds(range);
    if (from === to) {
      return new Intl.DateTimeFormat(tag, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(cursor);
    }
    if (mode === 'year') {
      return new Intl.DateTimeFormat(tag, { year: 'numeric', timeZone: 'UTC' }).format(cursor);
    }
    if (mode === 'month') {
      return new Intl.DateTimeFormat(tag, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(cursor);
    }
    const fmt = new Intl.DateTimeFormat(tag, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `${fmt.format(new Date(`${from}T00:00:00.000Z`))} – ${fmt.format(new Date(`${to}T00:00:00.000Z`))}`;
  }, [cursor, locale, mode]);

  function changeMode(next: HeatmapViewMode): void {
    setMode(next);
    setCursor(alignHeatmapCursor(cursor, next));
  }

  function onDateClick(isoDay: string): void {
    const nextMode = drillModeAfterClick(mode);
    setMode(nextMode);
    setCursor(cursorAfterHeatmapClick(isoDay, nextMode));
  }

  const periodEvents = useMemo(() => {
    if (!showHeatmapPeriodList(mode)) return [];
    const { from, to } = resolveRangeBounds(calendarRangeForMode(mode, cursor));
    return eventsInIsoRange(eventsByDay, from, to);
  }, [cursor, eventsByDay, mode]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-bold text-3xl">{t('heatmap.title')}</h1>
      </header>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-4">
        <ViewModeToggle
          label={t('heatmap.viewMode')}
          value={mode}
          onChange={changeMode}
          options={[
            {
              value: 'year',
              label: t('heatmap.viewYear'),
              icon: <Grid2x2 className="h-3.5 w-3.5" />,
            },
            {
              value: 'month',
              label: t('heatmap.viewMonth'),
              icon: <CalendarDays className="h-3.5 w-3.5" />,
            },
            {
              value: 'week',
              label: t('heatmap.viewWeek'),
              icon: <CalendarRange className="h-3.5 w-3.5" />,
            },
            {
              value: 'weekend',
              label: t('heatmap.viewWeekend'),
              icon: <PartyPopper className="h-3.5 w-3.5" />,
            },
            {
              value: 'day',
              label: t('heatmap.viewDay'),
              icon: <CalendarIcon className="h-3.5 w-3.5" />,
            },
          ]}
        />

        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,1.4fr)_auto] lg:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
              {t('heatmap.filterCategory')}
            </span>
            <select
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t('heatmap.filterAny')}</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
              {t('heatmap.filterRegion')}
            </span>
            <RegionFilter
              id="heatmap-region"
              regions={regions}
              value={regionId}
              onChange={setRegionId}
              anyLabel={t('heatmap.filterAny')}
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button
              type="button"
              variant="outline"
              className="w-full lg:w-auto"
              disabled={!filtersActive}
              onClick={() => {
                setCategory('');
                setRegionId('');
              }}
            >
              {t('heatmap.clearFilters')}
            </Button>
          </div>
        </div>
      </div>
      <p className="text-xs text-[var(--muted)]">
        {t('heatmap.resultsCount', {
          shown: String(filteredEvents.length),
          total: String(events.length),
        })}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setCursor(shiftHeatmapCursor(cursor, mode, -1))}
          >
            {t('heatmap.previous')}
          </Button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-medium sm:text-base">
            {label}
          </span>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setCursor(shiftHeatmapCursor(cursor, mode, 1))}
          >
            {t('heatmap.next')}
          </Button>
        </div>
        <Button type="button" variant="ghost" onClick={() => setCursor(startOfUtcDay(new Date()))}>
          {t('heatmap.today')}
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-[var(--muted)]">{t('heatmap.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{t('heatmap.error')}</p> : null}

      <EventDensityHeatmap
        mode={mode}
        cursor={cursor}
        eventsByDay={eventsByDay}
        locale={locale}
        eventsLabel={t('heatmap.chartSeries')}
        fewLabel={t('heatmap.few')}
        manyLabel={t('heatmap.many')}
        onDateClick={onDateClick}
      />
      <p className="text-xs text-[var(--muted)]">{t('heatmap.chartHint')}</p>

      {showHeatmapPeriodList(mode) ? (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-lg">{t('heatmap.periodListTitle')}</h2>
            <p className="text-sm text-[var(--muted)]">
              {t('heatmap.eventsCount', { count: String(periodEvents.length) })}
            </p>
          </div>
          {periodEvents.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('heatmap.noEventsPeriod')}</p>
          ) : (
            <ul className="space-y-3">
              {periodEvents.map((event) => (
                <li key={event.id} className="border-b border-[var(--border)] pb-3 last:border-0">
                  <Link
                    href={`/events/${event.id}`}
                    className="font-bold text-xl hover:text-primary"
                  >
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
      ) : null}
    </div>
  );
}
