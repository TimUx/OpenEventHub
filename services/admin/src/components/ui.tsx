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

/** Simple focus modal for short admin feedback flows (e.g. provider tests). */
export function ModalDialog({
  open,
  title,
  onClose,
  children,
  closeLabel,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly closeLabel: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="oeh-modal-title"
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="oeh-modal-title" className="font-bold text-lg">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="h-10 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold hover:bg-primary-soft"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

