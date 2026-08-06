'use client';

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, LayoutGrid, List, Rows3 } from 'lucide-react';

import type { Locale } from '@openeventhub/shared';

import { usePersistedViewMode } from '../hooks/use-persisted-view-mode';
import { useI18n } from '../i18n/i18n-provider';
import type { ApiCategory, ApiEvent, ApiRegion } from '../lib/api';
import {
  applyEventListFilters,
  DEFAULT_EVENT_LIST_FILTERS,
  eventListFiltersActive,
  type EventListFilterState,
  type EventSortField,
} from '../lib/event-list-filters';
import { cn } from '../lib/utils';
import { CalendarExportBar } from './calendar-export-bar';
import { CollapsiblePanel } from './collapsible-panel';
import { EventCard, type EventDisplayMode } from './event-card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ViewModeToggle } from './view-mode-toggle';

const EVENT_MODES: EventDisplayMode[] = ['list', 'details', 'tiles'];

const selectClass =
  'flex h-11 min-h-tap w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)]';

export function EventsBrowser({
  events,
  categories,
  regions,
  locale,
}: {
  readonly events: readonly ApiEvent[];
  readonly categories: readonly ApiCategory[];
  readonly regions: readonly ApiRegion[];
  readonly locale: Locale;
}) {
  const { t, dictionary } = useI18n();
  const [mode, setMode] = usePersistedViewMode<EventDisplayMode>('events', 'tiles', EVENT_MODES);
  const [filters, setFilters] = useState<EventListFilterState>(DEFAULT_EVENT_LIST_FILTERS);

  const visible = useMemo(() => applyEventListFilters(events, filters), [events, filters]);
  const filtersActive = eventListFiltersActive(filters);
  const feedQuery = useMemo(() => {
    const query: Record<string, string> = {};
    if (filters.category) query.category = filters.category;
    if (filters.regionId) query.regionId = filters.regionId;
    if (filters.dateFrom) query.from = filters.dateFrom;
    if (filters.dateTo) query.to = filters.dateTo;
    return query;
  }, [filters]);

  function patch(partial: Partial<EventListFilterState>): void {
    setFilters((current) => ({ ...current, ...partial }));
  }

  function clearFilters(): void {
    setFilters((current) => ({
      ...DEFAULT_EVENT_LIST_FILTERS,
      sortBy: current.sortBy,
      sortDir: current.sortDir,
    }));
  }

  function toggleSortDir(): void {
    setFilters((current) => ({
      ...current,
      sortDir: current.sortDir === 'asc' ? 'desc' : 'asc',
    }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl">{t('events.title')}</h1>
          <p className="max-w-2xl text-[var(--muted)]">{t('events.description')}</p>
        </div>
        <ViewModeToggle
          label={t('events.viewMode')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'list', label: t('events.viewList'), icon: <List className="h-3.5 w-3.5" /> },
            {
              value: 'details',
              label: t('events.viewDetails'),
              icon: <Rows3 className="h-3.5 w-3.5" />,
            },
            {
              value: 'tiles',
              label: t('events.viewTiles'),
              icon: <LayoutGrid className="h-3.5 w-3.5" />,
            },
          ]}
        />
      </header>

      <div className="space-y-2">
        <p className="text-sm text-[var(--muted)]" aria-live="polite">
          {t('events.resultsCount', { shown: visible.length, total: events.length })}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <CollapsiblePanel
            title={t('events.filtersToggle')}
            {...(filtersActive ? { badge: t('events.filtersActive') } : {})}
            className="shadow-none"
          >
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              aria-label={t('events.filters')}
              onSubmit={(event) => event.preventDefault()}
            >
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                  htmlFor="events-category"
                >
                  {t('events.filterCategory')}
                </label>
                <select
                  id="events-category"
                  className={selectClass}
                  value={filters.category}
                  onChange={(event) => patch({ category: event.target.value })}
                >
                  <option value="">{t('events.filterAny')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                  htmlFor="events-region"
                >
                  {t('events.filterRegion')}
                </label>
                <select
                  id="events-region"
                  className={selectClass}
                  value={filters.regionId}
                  onChange={(event) => patch({ regionId: event.target.value })}
                >
                  <option value="">{t('events.filterAny')}</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                  htmlFor="events-from"
                >
                  {t('events.filterFrom')}
                </label>
                <Input
                  id="events-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => patch({ dateFrom: event.target.value })}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                  htmlFor="events-to"
                >
                  {t('events.filterTo')}
                </label>
                <Input
                  id="events-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => patch({ dateTo: event.target.value })}
                />
              </div>

              <div>
                <label
                  className="mb-1 block text-xs font-medium text-[var(--muted)]"
                  htmlFor="events-sort"
                >
                  {t('events.filterSort')}
                </label>
                <select
                  id="events-sort"
                  className={selectClass}
                  value={filters.sortBy}
                  onChange={(event) => patch({ sortBy: event.target.value as EventSortField })}
                >
                  <option value="startAt">{t('events.sortStart')}</option>
                  <option value="title">{t('events.sortTitle')}</option>
                </select>
              </div>

              <div className="flex flex-col">
                <span className="mb-1 block text-xs font-medium text-[var(--muted)]">
                  {t('events.filterOrder')}
                </span>
                <div className="flex flex-1 items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 min-h-0 min-w-9 shrink-0"
                    aria-label={
                      filters.sortDir === 'asc' ? t('events.sortAsc') : t('events.sortDesc')
                    }
                    title={filters.sortDir === 'asc' ? t('events.sortAsc') : t('events.sortDesc')}
                    onClick={toggleSortDir}
                  >
                    {filters.sortDir === 'asc' ? (
                      <ArrowUpAZ className="h-4 w-4" aria-hidden />
                    ) : (
                      <ArrowDownAZ className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn('h-9 min-h-0 flex-1 px-3', !filtersActive && 'invisible')}
                    onClick={clearFilters}
                    disabled={!filtersActive}
                  >
                    {t('events.clearFilters')}
                  </Button>
                </div>
              </div>
            </form>
          </CollapsiblePanel>

          <CalendarExportBar
            events={visible}
            feedQuery={feedQuery}
            calendarName={filtersActive ? 'OpenEventHub (filtered)' : 'OpenEventHub'}
          />
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('events.empty')}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('events.emptyFiltered')}</p>
      ) : mode === 'tiles' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} mode="tiles" />
          ))}
        </div>
      ) : mode === 'list' ? (
        <div className="space-y-2">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} mode="list" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              locale={locale}
              mode="details"
              endsLabel={dictionary.detail.ends}
            />
          ))}
        </div>
      )}
    </div>
  );
}
