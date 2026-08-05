import type { ApiEvent } from '../lib/api';

export function EventJsonLd({ event, url }: { readonly event: ApiEvent; readonly url: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.summary ?? event.description ?? undefined,
    startDate: event.startAt,
    endDate: event.endAt ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
