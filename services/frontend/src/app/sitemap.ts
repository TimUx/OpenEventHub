import type { MetadataRoute } from 'next';

import { getSiteUrl, listEvents } from '../lib/api';

/** Refresh sitemap regularly so new published events appear for crawlers. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: '', priority: 1, changeFrequency: 'hourly' as const },
    { path: '/events', priority: 0.9, changeFrequency: 'hourly' as const },
    { path: '/calendar', priority: 0.8, changeFrequency: 'hourly' as const },
    { path: '/map', priority: 0.8, changeFrequency: 'hourly' as const },
    { path: '/submit', priority: 0.4, changeFrequency: 'monthly' as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${site}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  try {
    const events = await listEvents(500);
    const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
      url: `${site}/events/${event.id}`,
      lastModified: new Date(event.startAt),
      changeFrequency: 'daily',
      priority: 0.85,
    }));
    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
