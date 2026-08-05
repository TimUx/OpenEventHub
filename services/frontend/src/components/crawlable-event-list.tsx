import Link from 'next/link';

import type { ApiEvent } from '../lib/api';
import { formatEventDate } from '../lib/api';
import type { Locale } from '@openeventhub/shared';

/** Server-rendered event links for crawlers (and users without JS). */
export function CrawlableEventList({
  events,
  locale,
  title,
}: {
  readonly events: readonly ApiEvent[];
  readonly locale: Locale;
  readonly title: string;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-[var(--border)] pt-6" aria-label={title}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <ul className="space-y-2 text-sm">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {event.title}
            </Link>
            <span className="text-[var(--muted)]"> — {formatEventDate(event.startAt, locale)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
