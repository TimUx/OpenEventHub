import type { Metadata } from 'next';

import { CalendarBrowser } from '../../components/calendar-browser';
import { CrawlableEventList } from '../../components/crawlable-event-list';
import { getDictionary } from '../../i18n/get-dictionary';
import { getRequestLocale } from '../../i18n/request-locale';
import { listEvents } from '../../lib/api';
import { pageMetadata } from '../../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return pageMetadata({
    title: dictionary.calendar.metaTitle,
    description: dictionary.calendar.metaDescription,
    path: '/calendar',
  });
}

export default async function CalendarPage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const events = await listEvents(100).catch(() => []);

  return (
    <>
      <CalendarBrowser />
      <CrawlableEventList events={events} locale={locale} title={dictionary.seo.upcomingEvents} />
    </>
  );
}
