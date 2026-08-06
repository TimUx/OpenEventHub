'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

import { useAuth } from './auth-provider';
import { BrandMark } from './brand-mark';
import { LocaleSwitcher } from '../i18n/locale-switcher';
import { useI18n } from '../i18n/i18n-provider';
import { cn } from '../lib/utils';

const links = [
  { href: '/', key: 'nav.dashboard' },
  { href: '/sources', key: 'nav.sources' },
  { href: '/crawler', key: 'nav.crawler' },
  { href: '/scheduler', key: 'nav.scheduler' },
  { href: '/queues', key: 'nav.queues' },
  { href: '/logs', key: 'nav.logs' },
  { href: '/moderation', key: 'nav.moderation' },
  { href: '/events', key: 'nav.events' },
  { href: '/categories', key: 'nav.categories' },
  { href: '/regions', key: 'nav.regions' },
  { href: '/users', key: 'nav.users' },
  { href: '/ai-settings', key: 'nav.aiSettings' },
] as const;

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const { token, ready, login, logout, user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [email, setEmail] = useState('admin@openeventhub.local');
  const [password, setPassword] = useState('ChangeMeNow!');
  const [error, setError] = useState<string | null>(null);

  if (!ready) {
    return <p className="p-8 text-sm text-[var(--muted)]">{t('common.loading')}</p>;
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <div className="mb-4 flex justify-end">
          <LocaleSwitcher />
        </div>
        <h1 className="inline-flex items-center gap-3 text-3xl font-bold text-primary">
          <BrandMark className="h-10 w-10" />
          <span>{t('auth.title')}</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{t('auth.lead')}</p>
        <form
          className="mt-6 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-soft"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            setError(null);
            void login(email, password).catch(() => setError(t('auth.loginFailed')));
          }}
        >
          <label className="block text-sm font-semibold">
            {t('auth.email')}
            <input
              className="mt-1 h-11 w-full rounded-xl border border-[var(--border)] px-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm font-semibold">
            {t('auth.password')}
            <input
              className="mt-1 h-11 w-full rounded-xl border border-[var(--border)] px-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-contrast shadow-soft hover:bg-primary-bright"
          >
            {t('auth.signIn')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-contrast shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-primary-contrast"
          >
            <BrandMark className="h-8 w-8" />
            <span>{t('auth.title')}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-primary-contrast/90">
            <LocaleSwitcher variant="onPrimary" />
            <span>{user?.email ?? t('auth.signedIn')}</span>
            <button
              type="button"
              className="rounded-xl border border-primary-contrast/30 px-3 py-1.5 font-semibold text-primary-contrast hover:bg-primary-contrast/15"
              onClick={logout}
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>
        <nav
          aria-label={t('nav.admin')}
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t border-primary-contrast/15 px-2 py-2"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold',
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                  ? 'bg-primary-contrast/20 text-primary-contrast'
                  : 'text-primary-contrast/80 hover:bg-primary-contrast/10 hover:text-primary-contrast',
              )}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
