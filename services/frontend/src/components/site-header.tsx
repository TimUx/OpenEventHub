'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, List, MapPinned, PlusCircle, Search } from 'lucide-react';

import { useI18n } from '../i18n/i18n-provider';
import { LocaleSwitcher } from '../i18n/locale-switcher';
import { cn } from '../lib/utils';
import { AppearanceControls } from './appearance-controls';

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();

  const links = [
    { href: '/events', label: t('nav.events'), icon: List },
    { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    { href: '/map', label: t('nav.map'), icon: MapPinned },
    { href: '/search', label: t('nav.search'), icon: Search },
    { href: '/submit', label: t('nav.submit'), icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-contrast shadow-soft">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary-contrast">
          OpenEventHub
        </Link>
        <nav aria-label={t('nav.primary')} className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'inline-flex min-h-tap items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-primary-contrast/20 text-primary-contrast'
                    : 'text-primary-contrast/85 hover:bg-primary-contrast/10 hover:text-primary-contrast',
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher className="inline-flex items-center" variant="onPrimary" />
          <AppearanceControls />
        </div>
      </div>
      <nav
        aria-label={t('nav.mobile')}
        className="flex gap-1 overflow-x-auto border-t border-primary-contrast/15 px-2 py-2 md:hidden"
      >
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold',
                active
                  ? 'bg-primary-contrast/20 text-primary-contrast'
                  : 'text-primary-contrast/80',
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
