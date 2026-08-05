import type { Metadata } from 'next';

import { EventsBrowser } from '../../components/events-browser';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { listCategories, listEvents, listRegions } from '../../lib/api';
import { pageMetadata } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return pageMetadata({
    title: dictionary.events.metaTitle,
    description: dictionary.events.metaDescription,
    path: '/events',
  });
}

export default async function EventsPage() {
  const locale = await getRequestLocale();
  const [events, categories, regions] = await Promise.all([
    listEvents(100).catch(() => []),
    listCategories().catch(() => []),
    listRegions().catch(() => []),
  ]);

  return (
    <EventsBrowser events={events} categories={categories} regions={regions} locale={locale} />
  );
}
