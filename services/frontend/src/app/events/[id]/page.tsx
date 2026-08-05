import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EventActions } from '../../../components/event-actions';
import { EventJsonLd } from '../../../components/event-json-ld';
import { Badge } from '../../../components/ui/badge';
import { getDictionary, translate } from '../../../i18n/get-dictionary';
import { getRequestLocale } from '../../../i18n/request-locale';
import { formatEventDate, getEvent, getSiteUrl } from '../../../lib/api';

type PageProps = {
  readonly params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  try {
    const event = await getEvent(id);
    return {
      title: event.title,
      description: event.summary ?? event.description ?? dictionary.detail.fallbackDescription,
      alternates: { canonical: `/events/${event.id}` },
      openGraph: {
        title: event.title,
        description: event.summary ?? undefined,
        type: 'article',
        url: `/events/${event.id}`,
      },
    };
  } catch {
    return { title: dictionary.detail.notFound };
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
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
      <Badge>{formatEventDate(event.startAt, locale)}</Badge>
      <h1 className="font-bold text-4xl leading-tight">{event.title}</h1>
      {event.summary ? <p className="text-lg text-[var(--muted)]">{event.summary}</p> : null}
      <EventActions event={event} size="default" />
      {event.description ? (
        <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-[var(--foreground)]">
          {event.description}
        </div>
      ) : null}
      {event.endAt ? (
        <p className="text-sm text-[var(--muted)]">
          {translate(dictionary, 'detail.ends', { date: formatEventDate(event.endAt, locale) })}
        </p>
      ) : null}
    </article>
  );
}
