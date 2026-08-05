import type { Metadata } from 'next';

import { EventsBrowser } from '../../components/events-browser';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { listCategories, listEvents, listRegions } from '../../lib/api';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return {
    title: dictionary.events.metaTitle,
    description: dictionary.events.metaDescription,
  };
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
