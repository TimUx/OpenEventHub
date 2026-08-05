'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useI18n } from '../i18n/i18n-provider';
import {
  formatEventDate,
  getPublicApiBase,
  listCategories,
  listRegions,
  type ApiEvent,
} from '../lib/api';
import { eventHasCoordinates, filterMapEvents } from '../lib/map-events';

const EventMap = dynamic(() => import('./event-map').then((mod) => mod.EventMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(70vh,560px)] min-h-80 items-center justify-center rounded-xl bg-primary-soft text-sm font-semibold text-primary">
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

export function MapBrowser() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [regionId, setRegionId] = useState('');
  const [date, setDate] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['events', 'map'],
    queryFn: () => fetchEvents(t('map.error')),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: listRegions,
  });

  const filtered = useMemo(
    () => filterMapEvents(events, { query, category, regionId, date }),
    [events, query, category, regionId, date],
  );

  const onMap = useMemo(() => filtered.filter(eventHasCoordinates), [filtered]);
  const withoutCoords = useMemo(
    () => filtered.filter((event) => !eventHasCoordinates(event)),
    [filtered],
  );

  useEffect(() => {
    if (selectedId && !filtered.some((event) => event.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  function clearFilters() {
    setQuery('');
    setCategory('');
    setRegionId('');
    setDate('');
    setSelectedId(null);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{t('map.title')}</h1>
        <p className="text-[var(--muted)]">{t('map.description')}</p>
      </header>

      <form
        className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-soft md:grid-cols-4"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]" htmlFor="map-q">
            {t('map.searchLabel')}
          </label>
          <Input
            id="map-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('map.searchPlaceholder')}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]" htmlFor="map-category">
            {t('map.category')}
          </label>
          <select
            id="map-category"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">{t('map.any')}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]" htmlFor="map-region">
            {t('map.region')}
          </label>
          <select
            id="map-region"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
          >
            <option value="">{t('map.any')}</option>
            {regions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]" htmlFor="map-date">
            {t('map.date')}
          </label>
          <Input id="map-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-end gap-2 md:col-span-3">
          <p className="text-sm text-[var(--muted)]">
            {t('map.resultsCount', {
              shown: String(onMap.length),
              total: String(filtered.length),
            })}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            {t('map.clearFilters')}
          </Button>
        </div>
      </form>

      {isLoading ? <p className="text-sm text-[var(--muted)]">{t('map.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{t('map.error')}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden p-0">
          {!isLoading && onMap.length === 0 ? (
            <div className="flex h-[min(70vh,560px)] min-h-80 flex-col items-center justify-center gap-2 bg-primary-soft p-6 text-center">
              <p className="text-lg font-bold text-primary">{t('map.noPins')}</p>
              <p className="max-w-md text-sm text-[var(--muted)]">{t('map.noPinsHint')}</p>
            </div>
          ) : (
            <EventMap
              events={onMap}
              selectedId={selectedId}
              onSelect={setSelectedId}
              detailLabel={t('map.openEvent')}
              ariaLabel={t('map.mapLabel')}
            />
          )}
        </Card>

        <div className="max-h-[min(70vh,560px)] space-y-3 overflow-y-auto">
          {filtered.map((event) => {
            const hasCoords = eventHasCoordinates(event);
            const active = event.id === selectedId;
            return (
              <Card
                key={event.id}
                className={`p-4 shadow-none ${active ? 'border-primary bg-primary-soft' : ''}`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedId(event.id)}
                  disabled={!hasCoords}
                >
                  <p className="font-semibold hover:text-primary">{event.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatEventDate(event.startAt, locale)}
                    {event.venue?.name ? ` · ${event.venue.name}` : ''}
                    {event.venue?.city ? `, ${event.venue.city}` : ''}
                  </p>
                  {!hasCoords ? (
                    <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                      {t('map.noCoordinates')}
                    </p>
                  ) : null}
                </button>
                <Link
                  href={`/events/${event.id}`}
                  className="mt-2 inline-block text-xs font-semibold text-primary"
                >
                  {t('map.openEvent')}
                </Link>
              </Card>
            );
          })}
          {!isLoading && filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{t('map.emptyFiltered')}</p>
          ) : null}
          {withoutCoords.length > 0 && filtered.length > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              {t('map.withoutCoordsNote', { count: String(withoutCoords.length) })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
