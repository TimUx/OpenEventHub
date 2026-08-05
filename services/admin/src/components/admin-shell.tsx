'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';

import { useAuth } from './auth-provider';
import { cn } from '../lib/utils';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/sources', label: 'Sources' },
  { href: '/crawler', label: 'Crawler' },
  { href: '/scheduler', label: 'Scheduler' },
  { href: '/queues', label: 'Queues' },
  { href: '/moderation', label: 'Moderation' },
  { href: '/events', label: 'Events' },
  { href: '/categories', label: 'Categories' },
  { href: '/regions', label: 'Regions' },
  { href: '/users', label: 'Users' },
  { href: '/ai-settings', label: 'AI Settings' },
];

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const { token, ready, login, logout, user } = useAuth();
  const pathname = usePathname();
  const [email, setEmail] = useState('admin@openeventhub.local');
  const [password, setPassword] = useState('ChangeMeNow!');
  const [error, setError] = useState<string | null>(null);

  if (!ready) {
    return <p className="p-8 text-sm text-[var(--muted)]">Loading…</p>;
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <h1 className="font-display text-3xl">OpenEventHub Admin</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Sign in with an admin account.</p>
        <form
          className="mt-6 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            setError(null);
            void login(email, password).catch(() => setError('Login failed'));
          }}
        >
          <label className="block text-sm">
            Email
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            className="h-10 w-full rounded-md bg-accent text-white hover:bg-accent-bright"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-display text-xl tracking-tight">
            OpenEventHub Admin
          </Link>
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <span>{user?.email ?? 'Signed in'}</span>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 hover:bg-accent/10"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        </div>
        <nav
          aria-label="Admin"
          className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm',
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                  ? 'bg-accent/15 text-accent'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
