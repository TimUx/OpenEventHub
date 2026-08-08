'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from './auth-provider';
import { BrandMark } from './brand-mark';
import { LocaleSwitcher } from '../i18n/locale-switcher';
import { useI18n } from '../i18n/i18n-provider';
import { adminFetch } from '../lib/api';
import { getAdminLogoUrl, getAdminTitle } from '../lib/branding';
import { cn } from '../lib/utils';

type NavItem = {
  readonly href: string;
  readonly key: string;
  readonly pendingBadge?: boolean;
};

type NavGroup = {
  readonly id: string;
  readonly labelKey: string;
  readonly items: readonly NavItem[];
};

const navGroups: readonly NavGroup[] = [
  {
    id: 'overview',
    labelKey: 'nav.group.overview',
    items: [{ href: '/', key: 'nav.dashboard' }],
  },
  {
    id: 'content',
    labelKey: 'nav.group.content',
    items: [
      { href: '/events', key: 'nav.events', pendingBadge: true },
      { href: '/moderation', key: 'nav.moderation' },
      { href: '/categories', key: 'nav.categories' },
      { href: '/regions', key: 'nav.regions' },
    ],
  },
  {
    id: 'ingest',
    labelKey: 'nav.group.ingest',
    items: [
      { href: '/sources', key: 'nav.sources' },
      { href: '/crawler', key: 'nav.crawler' },
      { href: '/scheduler', key: 'nav.scheduler' },
    ],
  },
  {
    id: 'ops',
    labelKey: 'nav.group.ops',
    items: [
      { href: '/queues', key: 'nav.queues' },
      { href: '/logs', key: 'nav.logs' },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.group.system',
    items: [
      { href: '/ai-settings', key: 'nav.aiSettings' },
      { href: '/users', key: 'nav.users' },
    ],
  },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

function groupContainsPath(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isActivePath(pathname, item.href));
}

function usePendingModerationCount(token: string | null, pathname: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setCount(0);
      return;
    }
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const counts = await adminFetch<Record<string, number>>(
          '/api/v1/admin/events/counts',
          token!,
        );
        if (!cancelled) {
          setCount(counts.pending_moderation ?? 0);
        }
      } catch {
        if (!cancelled) {
          setCount(0);
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, pathname]);

  return count;
}

function BrandLogo({ className }: { readonly className?: string }) {
  const logoUrl = getAdminLogoUrl();
  if (logoUrl) {
    return (
      <img src={logoUrl} alt="" className={cn('h-8 w-8 shrink-0 object-contain', className)} />
    );
  }
  return className ? <BrandMark className={className} /> : <BrandMark />;
}

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const { token, ready, login, logout, user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [email, setEmail] = useState('admin@openeventhub.local');
  const [password, setPassword] = useState('ChangeMeNow!');
  const [error, setError] = useState<string | null>(null);
  const pendingReview = usePendingModerationCount(token, pathname);
  const brandTitle = getAdminTitle(t('auth.title'));

  const activeGroupId = useMemo(
    () => navGroups.find((group) => groupContainsPath(group, pathname))?.id ?? 'overview',
    [pathname],
  );
  const [openGroupId, setOpenGroupId] = useState<string | null>(activeGroupId);

  useEffect(() => {
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

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
          <BrandLogo className="h-10 w-10" />
          <span>{brandTitle}</span>
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

  const openGroup = navGroups.find((group) => group.id === openGroupId) ?? null;

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-contrast shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-primary-contrast"
          >
            <BrandLogo className="h-8 w-8" />
            <span>{brandTitle}</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-primary-contrast/90">
            {pendingReview > 0 ? (
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-400/20 px-3 py-1.5 font-semibold text-primary-contrast hover:bg-amber-400/30"
                title={t('nav.pendingReviewHint', { count: pendingReview })}
              >
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-xs font-bold text-primary">
                  {pendingReview > 99 ? '99+' : pendingReview}
                </span>
                <span className="hidden sm:inline">
                  {t('nav.pendingReview', { count: pendingReview })}
                </span>
              </Link>
            ) : null}
            <LocaleSwitcher variant="onPrimary" />
            <span className="hidden md:inline">{user?.email ?? t('auth.signedIn')}</span>
            <button
              type="button"
              className="rounded-xl border border-primary-contrast/30 px-3 py-1.5 font-semibold text-primary-contrast hover:bg-primary-contrast/15"
              onClick={logout}
            >
              {t('auth.signOut')}
            </button>
          </div>
        </div>

        <nav aria-label={t('nav.admin')} className="border-t border-primary-contrast/15">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1.5">
            {navGroups.map((group) => {
              const active = groupContainsPath(group, pathname);
              const open = openGroupId === group.id;
              const groupPending =
                group.items.some((item) => item.pendingBadge) && pendingReview > 0;
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-expanded={open}
                  className={cn(
                    'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold',
                    open || active
                      ? 'bg-primary-contrast/20 text-primary-contrast'
                      : 'text-primary-contrast/75 hover:bg-primary-contrast/10 hover:text-primary-contrast',
                  )}
                  onClick={() => setOpenGroupId((prev) => (prev === group.id ? null : group.id))}
                >
                  <span>{t(group.labelKey)}</span>
                  <span aria-hidden className="text-[10px] opacity-80">
                    {open ? '▾' : '▸'}
                  </span>
                  {groupPending ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[10px] font-bold text-primary">
                      {pendingReview > 99 ? '99+' : pendingReview}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {openGroup ? (
            <div className="border-t border-primary-contrast/10 bg-primary-contrast/5">
              <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-1.5">
                {openGroup.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-sm font-semibold',
                        active
                          ? 'bg-primary-contrast/25 text-primary-contrast'
                          : 'text-primary-contrast/85 hover:bg-primary-contrast/10 hover:text-primary-contrast',
                      )}
                    >
                      {t(item.key)}
                      {item.pendingBadge && pendingReview > 0 ? (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-xs font-bold text-primary">
                          {pendingReview > 99 ? '99+' : pendingReview}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
