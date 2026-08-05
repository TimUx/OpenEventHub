import type { Metadata } from 'next';

import { EventCard } from '../../components/event-card';
import { listCategories, listEvents, listRegions } from '../../lib/api';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Browse published events on OpenEventHub.',
};

export default async function EventsPage() {
  const [events, categories, regions] = await Promise.all([
    listEvents(100).catch(() => []),
    listCategories().catch(() => []),
    listRegions().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">Event list</h1>
        <p className="text-[var(--muted)]">
          Published events from all connected sources. Filters: category, region, and free text via
          Search.
        </p>
      </header>

      <aside
        className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm"
        aria-label="Available filters"
      >
        <span className="text-[var(--muted)]">Categories:</span>
        {categories.length === 0 ? (
          <span className="text-[var(--muted)]">none yet</span>
        ) : (
          categories.slice(0, 8).map((category) => (
            <a
              key={category.id}
              href={`/search?q=${encodeURIComponent(category.name)}`}
              className="rounded-full bg-teal/10 px-2.5 py-0.5 text-teal dark:text-teal-bright"
            >
              {category.name}
            </a>
          ))
        )}
        <span className="ml-2 text-[var(--muted)]">Regions:</span>
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
        <p className="text-sm text-[var(--muted)]">No published events available.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
