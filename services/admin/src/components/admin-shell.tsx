'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Bot,
  CalendarClock,
  FolderTree,
  LayoutDashboard,
  Layers,
  ListTodo,
  MapPinned,
  Menu,
  Radar,
  ScrollText,
  Settings2,
  Shield,
  Sparkles,
  UserCircle,
  Users,
  X,
} from 'lucide-react';

import { useAuth } from './auth-provider';
import { BrandMark } from './brand-mark';
import { LocaleSwitcher } from '../i18n/locale-switcher';
import { useI18n } from '../i18n/i18n-provider';
import { adminFetch } from '../lib/api';
import { getAdminLogoUrl, getAdminTitle } from '../lib/branding';
import { cn } from '../lib/utils';

const DRAWER_WIDTH_CLASS = 'w-60'; // 15rem / 240px — mirrors HaushaltsRadar

type NavItem = {
  readonly href: string;
  readonly key: string;
  readonly icon: ReactNode;
  readonly pendingBadge?: boolean;
};

type NavGroup = {
  readonly id: string;
  readonly labelKey: string;
  readonly items: readonly NavItem[];
};

const iconClass = 'h-4 w-4 shrink-0';

const navGroups: readonly NavGroup[] = [
  {
    id: 'overview',
    labelKey: 'nav.group.overview',
    items: [
      {
        href: '/',
        key: 'nav.dashboard',
        icon: <LayoutDashboard className={iconClass} aria-hidden />,
      },
    ],
  },
  {
    id: 'content',
    labelKey: 'nav.group.content',
    items: [
      {
        href: '/events',
        key: 'nav.events',
        icon: <ListTodo className={iconClass} aria-hidden />,
        pendingBadge: true,
      },
      {
        href: '/moderation',
        key: 'nav.moderation',
        icon: <Shield className={iconClass} aria-hidden />,
      },
      {
        href: '/categories',
        key: 'nav.categories',
        icon: <FolderTree className={iconClass} aria-hidden />,
      },
      {
        href: '/regions',
        key: 'nav.regions',
        icon: <MapPinned className={iconClass} aria-hidden />,
      },
    ],
  },
  {
    id: 'ingest',
    labelKey: 'nav.group.ingest',
    items: [
      {
        href: '/sources',
        key: 'nav.sources',
        icon: <Radar className={iconClass} aria-hidden />,
      },
      {
        href: '/crawler',
        key: 'nav.crawler',
        icon: <Sparkles className={iconClass} aria-hidden />,
      },
      {
        href: '/scheduler',
        key: 'nav.scheduler',
        icon: <CalendarClock className={iconClass} aria-hidden />,
      },
      {
        href: '/import-settings',
        key: 'nav.importSettings',
        icon: <Settings2 className={iconClass} aria-hidden />,
      },
    ],
  },
  {
    id: 'ops',
    labelKey: 'nav.group.ops',
    items: [
      {
        href: '/queues',
        key: 'nav.queues',
        icon: <Layers className={iconClass} aria-hidden />,
      },
      {
        href: '/logs',
        key: 'nav.logs',
        icon: <ScrollText className={iconClass} aria-hidden />,
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.group.system',
    items: [
      {
        href: '/ai-settings',
        key: 'nav.aiSettings',
        icon: <Bot className={iconClass} aria-hidden />,
      },
      {
        href: '/users',
        key: 'nav.users',
        icon: <Users className={iconClass} aria-hidden />,
      },
    ],
  },
  {
    id: 'account',
    labelKey: 'nav.group.account',
    items: [
      {
        href: '/profile',
        key: 'nav.profile',
        icon: <UserCircle className={iconClass} aria-hidden />,
      },
    ],
  },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
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

function PendingBadge({ count }: { readonly count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-xs font-bold text-primary">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const { token, ready, login, logout, user } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const [email, setEmail] = useState('admin@openeventhub.local');
  const [password, setPassword] = useState('ChangeMeNow!');
  const [error, setError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pendingReview = usePendingModerationCount(token, pathname);
  const brandTitle = getAdminTitle(t('auth.title'));

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

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

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[var(--border)] px-4">
        <BrandLogo className="h-8 w-8" />
        <Link
          href="/"
          className="truncate text-sm font-bold tracking-tight text-primary"
          onClick={() => setMobileNavOpen(false)}
        >
          {brandTitle}
        </Link>
        <button
          type="button"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--background)] md:hidden"
          aria-label={t('nav.closeMenu')}
          onClick={() => setMobileNavOpen(false)}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <nav aria-label={t('nav.admin')} className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group, index) => (
          <div
            key={group.id}
            className={cn(index > 0 && 'mt-3 border-t border-[var(--border)] pt-3')}
          >
            <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t(group.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-soft text-primary'
                          : 'text-[var(--foreground)] hover:bg-[var(--background)]',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span
                        className={cn(active ? 'text-primary' : 'text-[var(--muted)]')}
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                      {item.pendingBadge ? <PendingBadge count={pendingReview} /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label={t('nav.closeMenu')}
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 border-r border-[var(--border)] bg-[var(--card)] shadow-soft transition-transform duration-200 ease-out md:translate-x-0',
          DRAWER_WIDTH_CLASS,
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebar}
      </aside>

      <div className={cn('flex min-h-screen flex-col', 'md:pl-60')}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 sm:px-4">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--foreground)] hover:bg-[var(--background)] md:hidden"
            aria-label={t('nav.openMenu')}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)] md:hidden">
              {brandTitle}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted)] sm:gap-3">
            {pendingReview > 0 ? (
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 font-semibold text-primary hover:bg-amber-100"
                title={t('nav.pendingReviewHint', { count: pendingReview })}
              >
                <PendingBadge count={pendingReview} />
                <span className="hidden sm:inline">
                  {t('nav.pendingReview', { count: pendingReview })}
                </span>
              </Link>
            ) : null}
            <LocaleSwitcher />
            <span className="hidden max-w-[14rem] truncate lg:inline">
              {user?.email ?? t('auth.signedIn')}
            </span>
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] px-3 py-1.5 font-semibold text-[var(--foreground)] hover:bg-[var(--background)]"
              onClick={logout}
            >
              {t('auth.signOut')}
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
