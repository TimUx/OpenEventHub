import Link from 'next/link';

import { EventCard } from '../components/event-card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { listEvents } from '../lib/api';

export default async function HomePage() {
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let error: string | null = null;

  try {
    events = await listEvents(6);
  } catch {
    error = 'Events could not be loaded from the API yet.';
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 shadow-soft md:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal dark:text-teal-bright">
          Event Intelligence
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-tight md:text-5xl">
          OpenEventHub
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--muted)] md:text-lg">
          Discover regional events from many sources — consolidated into one trusted view.
        </p>
        <form action="/search" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row" role="search">
          <label className="sr-only" htmlFor="home-search">
            Search events
          </label>
          <Input id="home-search" name="q" placeholder="Search concerts, sports, culture…" />
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/events"
            className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 hover:bg-teal/10"
          >
            Browse events
          </Link>
          <Link
            href="/calendar"
            className="inline-flex h-10 items-center rounded-md px-4 text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Open calendar
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl">Upcoming</h2>
          <Link href="/events" className="text-sm text-teal dark:text-teal-bright">
            View all
          </Link>
        </div>
        {error ? (
          <p className="rounded-md border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            {error}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No published events yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
