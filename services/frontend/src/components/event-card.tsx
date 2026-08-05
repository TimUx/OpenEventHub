import Link from 'next/link';

import type { ApiEvent } from '../lib/api';
import { formatEventDate } from '../lib/api';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

export function EventCard({ event }: { readonly event: ApiEvent }) {
  return (
    <Card className="transition-transform hover:-translate-y-0.5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Badge>{formatEventDate(event.startAt)}</Badge>
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{event.status}</span>
      </div>
      <h2 className="font-display text-xl leading-snug">
        <Link href={`/events/${event.id}`} className="hover:text-teal dark:hover:text-teal-bright">
          {event.title}
        </Link>
      </h2>
      {event.summary ? <p className="mt-2 text-sm text-[var(--muted)]">{event.summary}</p> : null}
    </Card>
  );
}
