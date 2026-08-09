'use client';

import { useState } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { moderationStatusLabel } from '../../i18n/labels';
import { adminFetch } from '../../lib/api';

type ModerationItem = {
  id: string;
  status: string;
  reason: string | null;
  notes: string | null;
  reviewedBy: string | null;
  createdAt: string;
  userSubmission: {
    id: string;
    type: string;
    payload: unknown;
    submitterEmail: string | null;
  } | null;
  event: { id: string; title: string; status: string } | null;
};

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'escalated'] as const;

const STATUS_LABEL_KEYS = {
  pending: 'moderation.status.pending',
  approved: 'moderation.status.approved',
  rejected: 'moderation.status.rejected',
  escalated: 'moderation.status.escalated',
} as const;

export default function ModerationPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>('pending');
  const path = `/api/v1/admin/moderation?status=${encodeURIComponent(filter)}&limit=100`;
  const { data, error, loading, reload } = useAdminQuery<ModerationItem[]>(path);
  const [message, setMessage] = useState<string | null>(null);

  async function decide(id: string, status: 'approved' | 'rejected' | 'escalated') {
    if (!token) return;
    setMessage(null);
    await adminFetch(`/api/v1/admin/moderation/${id}/decide`, token, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    setMessage(t('moderation.marked', { status: t(STATUS_LABEL_KEYS[status]) }));
    await reload();
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('moderation.title')} description={t('moderation.description')} />
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              filter === status
                ? 'bg-primary text-primary-contrast'
                : 'border border-[var(--border)]'
            }`}
            onClick={() => setFilter(status)}
          >
            {t(STATUS_LABEL_KEYS[status])}
          </button>
        ))}
      </div>
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((item) => (
          <Panel key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <StatusPill value={moderationStatusLabel(t, item.status)} />
                  <span className="text-[var(--muted)]">
                    {item.userSubmission?.type ?? t('moderation.item')} ·{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                {item.event ? <p>{t('moderation.event', { title: item.event.title })}</p> : null}
                {item.userSubmission?.submitterEmail ? (
                  <p>{t('moderation.from', { email: item.userSubmission.submitterEmail })}</p>
                ) : null}
                <pre className="max-h-40 overflow-auto rounded-md bg-[var(--background)] p-2 text-xs">
                  {JSON.stringify(item.userSubmission?.payload ?? {}, null, 2)}
                </pre>
              </div>
              {item.status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-3 py-1.5 text-xs text-white"
                    onClick={() => void decide(item.id, 'approved')}
                  >
                    {t('moderation.approve')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700"
                    onClick={() => void decide(item.id, 'rejected')}
                  >
                    {t('moderation.reject')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
                    onClick={() => void decide(item.id, 'escalated')}
                  >
                    {t('moderation.escalate')}
                  </button>
                </div>
              ) : null}
            </div>
          </Panel>
        ))}
      </div>
      {!loading && (data?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t('moderation.empty')}</p>
      ) : null}
    </div>
  );
}
