import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventJsonLd } from '../../../components/event-json-ld';
import { Badge } from '../../../components/ui/badge';
import { formatEventDate, getEvent, getSiteUrl } from '../../../lib/api';

type PageProps = {
  readonly params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await getEvent(id);
    return {
      title: event.title,
      description: event.summary ?? event.description ?? 'Event on OpenEventHub',
      alternates: { canonical: `/events/${event.id}` },
      openGraph: {
        title: event.title,
        description: event.summary ?? undefined,
        type: 'article',
        url: `/events/${event.id}`,
      },
    };
  } catch {
    return { title: 'Event not found' };
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  let event;
  try {
    event = await getEvent(id);
  } catch {
    notFound();
  }

  const pageUrl = `${getSiteUrl()}/events/${event.id}`;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <EventJsonLd event={event} url={pageUrl} />
      <Badge>{formatEventDate(event.startAt)}</Badge>
      <h1 className="font-display text-4xl leading-tight">{event.title}</h1>
      {event.summary ? <p className="text-lg text-[var(--muted)]">{event.summary}</p> : null}
      {event.description ? (
        <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-[var(--foreground)]">
          {event.description}
        </div>
      ) : null}
      {event.endAt ? (
        <p className="text-sm text-[var(--muted)]">Ends {formatEventDate(event.endAt)}</p>
      ) : null}
    </article>
  );
}
