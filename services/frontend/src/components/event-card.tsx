import Link from 'next/link';

import type { Locale } from '@openeventhub/shared';

import type { ApiEvent } from '../lib/api';
import { formatEventDate } from '../lib/api';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

export type EventDisplayMode = 'tiles' | 'list' | 'details';

export function EventCard({
  event,
  locale = 'de',
  mode = 'tiles',
  endsLabel,
}: {
  readonly event: ApiEvent;
  readonly locale?: Locale;
  readonly mode?: EventDisplayMode;
  readonly endsLabel?: string;
}) {
  if (mode === 'list') {
    return (
      <Link
        href={`/events/${event.id}`}
        className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:bg-primary-soft"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{event.title}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {formatEventDate(event.startAt, locale)}
          </p>
        </div>
        <span className="shrink-0 text-xs uppercase tracking-wide text-[var(--muted)]">
          {event.status}
        </span>
      </Link>
    );
  }

  if (mode === 'details') {
    return (
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{formatEventDate(event.startAt, locale)}</Badge>
              <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                {event.status}
              </span>
            </div>
            <h2 className="font-bold text-2xl leading-snug">
              <Link href={`/events/${event.id}`} className="hover:text-primary">
                {event.title}
              </Link>
            </h2>
            {event.summary ? <p className="text-sm text-[var(--muted)]">{event.summary}</p> : null}
            {event.description ? (
              <p className="line-clamp-3 text-sm leading-relaxed text-[var(--foreground)]/90">
                {event.description}
              </p>
            ) : null}
            {event.endAt && endsLabel ? (
              <p className="text-xs text-[var(--muted)]">
                {endsLabel.replace('{date}', formatEventDate(event.endAt, locale))}
              </p>
            ) : null}
          </div>
          <Link href={`/events/${event.id}`} className="shrink-0 text-sm text-primary">
            →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <Badge>{formatEventDate(event.startAt, locale)}</Badge>
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{event.status}</span>
      </div>
      <h2 className="font-bold text-xl leading-snug">
        <Link href={`/events/${event.id}`} className="hover:text-primary">
          {event.title}
        </Link>
      </h2>
      {event.summary ? <p className="mt-2 text-sm text-[var(--muted)]">{event.summary}</p> : null}
    </Card>
  );
}
