import type { MetadataRoute } from 'next';

import { getSiteUrl, listEvents } from '../lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const staticRoutes: MetadataRoute.Sitemap = ['', '/events', '/calendar', '/map', '/search'].map(
    (path) => ({
      url: `${site}${path}`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: path === '' ? 1 : 0.7,
    }),
  );

  try {
    const events = await listEvents(100);
    const eventRoutes = events.map((event) => ({
      url: `${site}/events/${event.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
