'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Flame, List, MapPinned, PlusCircle, Search } from 'lucide-react';

import { useI18n } from '../i18n/i18n-provider';
import { LocaleSwitcher } from '../i18n/locale-switcher';
import { cn } from '../lib/utils';
import { AppearanceControls } from './appearance-controls';
import { BrandMark } from './brand-mark';

export function SiteHeader() {
  const pathname = usePathname();
  const { t } = useI18n();

  const links = [
    { href: '/events', label: t('nav.events'), icon: List },
    { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    { href: '/heatmap', label: t('nav.heatmap'), icon: Flame },
    { href: '/map', label: t('nav.map'), icon: MapPinned },
    { href: '/search', label: t('nav.search'), icon: Search },
    { href: '/submit', label: t('nav.submit'), icon: PlusCircle },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-primary text-primary-contrast shadow-soft pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/"
            className="inline-flex min-h-tap items-center gap-2.5 text-lg font-bold tracking-tight text-primary-contrast sm:text-xl"
          >
            <BrandMark className="h-8 w-8 shrink-0" />
            <span className="truncate">OpenEventHub</span>
          </Link>
          <nav aria-label={t('nav.primary')} className="hidden items-center gap-1 lg:flex">
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
          <div className="flex shrink-0 items-center gap-0.5">
            <LocaleSwitcher variant="onPrimary" />
            <AppearanceControls />
          </div>
        </div>
      </header>

      <nav
        aria-label={t('nav.mobile')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] shadow-soft lg:hidden"
      >
        <ul className="mx-auto grid max-w-6xl grid-cols-6 gap-0 px-0.5 pt-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex min-h-tap flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight sm:text-xs',
                    active
                      ? 'text-primary'
                      : 'text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]',
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', active && 'text-primary')}
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
