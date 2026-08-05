'use client';

import { useState } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

type Repeatable = {
  key: string;
  name: string;
  pattern: string | null;
  next: number;
  tz: string | null;
};

export default function SchedulerPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Repeatable[]>('/api/v1/admin/scheduler');
  const [message, setMessage] = useState<string | null>(null);

  async function reloadSchedules() {
    if (!token) return;
    setMessage(null);
    const result = await adminFetch<{ scheduled: number }>(
      '/api/v1/admin/scheduler/reload',
      token,
      { method: 'POST' },
    );
    setMessage(t('scheduler.reloaded', { count: result.scheduled }));
    await reload();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('scheduler.title')}
        description={t('scheduler.description')}
        action={
          <button
            type="button"
            className="rounded-xl bg-primary px-3 py-1.5 text-sm text-white"
            onClick={() => void reloadSchedules()}
          >
            {t('scheduler.reloadFromSources')}
          </button>
        }
      />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Panel>
        <ul className="space-y-2 text-sm">
          {(data ?? []).map((job) => (
            <li
              key={job.key}
              className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)]/50 py-2"
            >
              <span>
                {job.name} · <code>{job.pattern}</code>
              </span>
              <span className="text-[var(--muted)]">
                {t('common.next')} {job.next ? new Date(job.next).toLocaleString() : '—'}
              </span>
            </li>
          ))}
        </ul>
        {!loading && (data?.length ?? 0) === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('scheduler.empty')}</p>
        ) : null}
      </Panel>
    </div>
  );
}
