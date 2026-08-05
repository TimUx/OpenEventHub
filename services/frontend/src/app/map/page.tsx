'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { formatEventDate, getPublicApiBase, type ApiEvent } from '../../lib/api';
import { Card } from '../../components/ui/card';

async function fetchEvents(): Promise<ApiEvent[]> {
  const response = await fetch(`${getPublicApiBase()}/api/v1/events?limit=100`);
  if (!response.ok) {
    throw new Error('Failed to load events');
  }
  return (await response.json()) as ApiEvent[];
}

export default function MapPage() {
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['events', 'map'],
    queryFn: fetchEvents,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Map</h1>
        <p className="text-[var(--muted)]">
          Geographic overview. Venue coordinates land with geocoding; until then events link out to
          OpenStreetMap search.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="relative min-h-80 overflow-hidden p-0">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(20,184,166,0.25),transparent_45%),linear-gradient(160deg,#dfeae6,#f7faf8)] dark:bg-[radial-gradient(circle_at_30%_40%,rgba(45,212,191,0.15),transparent_45%),linear-gradient(160deg,#10221f,#1a332e)]"
            aria-hidden
          />
          <div className="relative flex h-full min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-display text-2xl">Regional focus</p>
            <p className="max-w-md text-sm text-[var(--muted)]">
              Map pins will appear once venues are geocoded. Use the list to explore events and open
              locations externally.
            </p>
            <a
              className="text-sm text-teal dark:text-teal-bright"
              href="https://www.openstreetmap.org/"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
          </div>
        </Card>

        <div className="space-y-3">
          {isLoading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
          {error ? <p className="text-sm text-red-700">Could not load events.</p> : null}
          {events.map((event) => (
            <Card key={event.id} className="p-4 shadow-none">
              <Link href={`/events/${event.id}`} className="font-medium hover:text-teal">
                {event.title}
              </Link>
              <p className="text-xs text-[var(--muted)]">{formatEventDate(event.startAt)}</p>
              <a
                className="mt-2 inline-block text-xs text-teal dark:text-teal-bright"
                href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(event.title)}`}
                target="_blank"
                rel="noreferrer"
              >
                Search on map
              </a>
            </Card>
          ))}
          {!isLoading && events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No published events to place on the map.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
