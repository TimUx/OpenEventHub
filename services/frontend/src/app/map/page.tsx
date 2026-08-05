import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CrawlableEventList } from '../../components/crawlable-event-list';
import { MapBrowser } from '../../components/map-browser';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { listEvents } from '../../lib/api';
import { pageMetadata } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return pageMetadata({
    title: dictionary.map.metaTitle,
    description: dictionary.map.metaDescription,
    path: '/map',
  });
}

export default async function MapPage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const events = await listEvents(100).catch(() => []);

  return (
    <>
      <Suspense fallback={<div className="text-sm text-[var(--muted)]">…</div>}>
        <MapBrowser />
      </Suspense>
      <CrawlableEventList events={events} locale={locale} title={dictionary.seo.upcomingEvents} />
    </>
  );
}
