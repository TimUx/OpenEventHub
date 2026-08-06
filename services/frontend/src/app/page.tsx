import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, List, MapPinned, PlusCircle } from 'lucide-react';

import { EventCard } from '../components/event-card';
import { SiteJsonLd } from '../components/site-json-ld';
import { Button } from '../components/ui/button';
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

  const features = [
    {
      href: '/events',
      icon: List,
      title: dictionary.home.features.events.title,
      description: dictionary.home.features.events.description,
    },
    {
      href: '/calendar',
      icon: CalendarDays,
      title: dictionary.home.features.calendar.title,
      description: dictionary.home.features.calendar.description,
    },
    {
      href: '/map',
      icon: MapPinned,
      title: dictionary.home.features.map.title,
      description: dictionary.home.features.map.description,
    },
    {
      href: '/submit',
      icon: PlusCircle,
      title: dictionary.home.features.submit.title,
      description: dictionary.home.features.submit.description,
    },
  ] as const;

  return (
    <div className="space-y-10">
      <SiteJsonLd />

      <section className="space-y-5">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-[var(--foreground)] md:text-3xl">
            {dictionary.home.title}
          </h1>
          <p className="text-base leading-relaxed text-[var(--muted)]">{dictionary.home.lead}</p>
        </div>

        <form
          action="/search"
          className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
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
      </section>

      <section aria-labelledby="home-features-heading">
        <h2 id="home-features-heading" className="sr-only">
          {dictionary.home.featuresLabel}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ href, icon: Icon, title, description }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--foreground)]">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-[var(--muted)]">
                    {description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold md:text-2xl">{dictionary.home.upcoming}</h2>
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
