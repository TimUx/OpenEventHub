import type { ApiEvent } from '../lib/api';

export function EventJsonLd({ event, url }: { readonly event: ApiEvent; readonly url: string }) {
  const venue = event.venue;
  const location =
    venue == null
      ? undefined
      : {
          '@type': 'Place' as const,
          name: venue.name,
          address: {
            '@type': 'PostalAddress' as const,
            streetAddress: venue.address ?? undefined,
            addressLocality: venue.city ?? undefined,
          },
          ...(venue.latitude != null && venue.longitude != null
            ? {
                geo: {
                  '@type': 'GeoCoordinates' as const,
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                },
              }
            : {}),
        };

  const imageUrls = (event.media ?? [])
    .map((item) => item.url)
    .filter((url): url is string => Boolean(url));

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
    location,
    image: imageUrls.length === 1 ? imageUrls[0] : imageUrls.length > 1 ? imageUrls : undefined,
    keywords: event.categories?.map((category) => category.name).join(', ') || undefined,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
