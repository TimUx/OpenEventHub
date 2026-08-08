import type { Metadata } from 'next';

import { CrawlableEventList } from '../../components/crawlable-event-list';
import { HeatmapBrowser } from '../../components/heatmap-browser';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { listEvents } from '../../lib/api';
import { pageMetadata } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return pageMetadata({
    title: dictionary.heatmap.metaTitle,
    description: dictionary.heatmap.metaDescription,
    path: '/heatmap',
  });
}

export default async function HeatmapPage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const events = await listEvents(100).catch(() => []);

  return (
    <>
      <HeatmapBrowser />
      <CrawlableEventList events={events} locale={locale} title={dictionary.seo.upcomingEvents} />
    </>
  );
}
