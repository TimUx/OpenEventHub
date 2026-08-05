'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { useAuth } from './auth-provider';
import { adminFetch } from '../lib/api';

export function useAdminQuery<T>(path: string | null) {
  const { token, logout } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path && token));

  async function reload() {
    if (!token || !path) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetch<T>(path, token));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
        logout();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [path, token]);

  return { data, error, loading, reload, token };
}

export function PageHeader({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-bold text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = '',
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 ${className}`}>
      {children}
    </div>
  );
}

export function StatusPill({ value }: { readonly value: string }) {
  return (
    <span className="rounded-xl bg-primary-soft px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
      {value}
    </span>
  );
}
