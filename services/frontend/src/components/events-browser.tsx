'use client';

import { LayoutGrid, List, Rows3 } from 'lucide-react';

import type { Locale } from '@openeventhub/shared';

import { usePersistedViewMode } from '../hooks/use-persisted-view-mode';
import { useI18n } from '../i18n/i18n-provider';
import type { ApiCategory, ApiEvent, ApiRegion } from '../lib/api';
import { EventCard, type EventDisplayMode } from './event-card';
import { ViewModeToggle } from './view-mode-toggle';

const EVENT_MODES: EventDisplayMode[] = ['list', 'details', 'tiles'];

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

      <aside
        className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm"
        aria-label={t('events.filters')}
      >
        <span className="text-[var(--muted)]">{t('events.categories')}</span>
        {categories.length === 0 ? (
          <span className="text-[var(--muted)]">{t('events.noneYet')}</span>
        ) : (
          categories.slice(0, 8).map((category) => (
            <a
              key={category.id}
              href={`/search?q=${encodeURIComponent(category.name)}`}
              className="rounded-full bg-primary-soft px-2.5 py-0.5 text-primary"
            >
              {category.name}
            </a>
          ))
        )}
        <span className="ml-2 text-[var(--muted)]">{t('events.regions')}</span>
        {regions.slice(0, 6).map((region) => (
          <a
            key={region.id}
            href={`/search?q=${encodeURIComponent(region.name)}`}
            className="rounded-full bg-sand/40 px-2.5 py-0.5 text-ink dark:bg-sand/20 dark:text-paper"
          >
            {region.name}
          </a>
        ))}
      </aside>

      {events.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('events.empty')}</p>
      ) : mode === 'tiles' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} mode="tiles" />
          ))}
        </div>
      ) : mode === 'list' ? (
        <div className="space-y-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} mode="list" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
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
