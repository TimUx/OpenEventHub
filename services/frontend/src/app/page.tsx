import Link from 'next/link';
import type { Metadata } from 'next';

import { EventCard } from '../components/event-card';
import { SiteJsonLd } from '../components/site-json-ld';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getDictionary } from '../i18n/get-dictionary';
import { getRequestLocale } from '../i18n/request-locale';
import { listEvents } from '../lib/api';
import { pageMetadata } from '../lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  const base = pageMetadata({
    title: 'OpenEventHub',
    description: dictionary.meta.description,
    path: '/',
  });
  return {
    ...base,
    title: { absolute: 'OpenEventHub' },
  };
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  let events: Awaited<ReturnType<typeof listEvents>> = [];
  let error: string | null = null;

  try {
    events = await listEvents(6);
  } catch {
    error = dictionary.home.loadError;
  }

  return (
    <div className="space-y-8">
      <SiteJsonLd />
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-8 shadow-soft md:px-8">
        <p className="text-sm font-semibold text-primary">{dictionary.home.eyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
          {dictionary.home.title}
        </h1>
        <p className="mt-3 max-w-xl text-base text-[var(--muted)] md:text-lg">
          {dictionary.home.lead}
        </p>
        <form
          action="/search"
          className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
          role="search"
        >
          <label className="sr-only" htmlFor="home-search">
            {dictionary.home.searchLabel}
          </label>
          <Input id="home-search" name="q" placeholder={dictionary.home.searchPlaceholder} />
          <Button type="submit" className="shrink-0">
            {dictionary.home.search}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/events" className={buttonVariants({ variant: 'outline' })}>
            {dictionary.home.browse}
          </Link>
          <Link href="/calendar" className={buttonVariants({ variant: 'ghost' })}>
            {dictionary.home.openCalendar}
          </Link>
          <Link href="/submit" className={buttonVariants({ variant: 'default' })}>
            {dictionary.home.submitCta}
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">{dictionary.home.upcoming}</h2>
          <Link href="/events" className="text-sm font-semibold text-primary">
            {dictionary.home.viewAll}
          </Link>
        </div>
        {error ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
            {error}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{dictionary.home.empty}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
