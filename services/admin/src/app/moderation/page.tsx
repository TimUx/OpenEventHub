'use client';

import { useState } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
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

export default function ModerationPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState('pending');
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
    setMessage(`Marked ${status}`);
    await reload();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Moderation"
        description="Review submissions and publish or reject decisions (logged)."
      />
      <div className="flex flex-wrap gap-2">
        {['pending', 'approved', 'rejected', 'escalated'].map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              filter === status ? 'bg-accent text-white' : 'border border-[var(--border)]'
            }`}
            onClick={() => setFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>
      {message ? <p className="text-sm text-accent">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((item) => (
          <Panel key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <StatusPill value={item.status} />
                  <span className="text-[var(--muted)]">
                    {item.userSubmission?.type ?? 'item'} ·{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                {item.event ? <p>Event: {item.event.title}</p> : null}
                {item.userSubmission?.submitterEmail ? (
                  <p>From: {item.userSubmission.submitterEmail}</p>
                ) : null}
                <pre className="max-h-40 overflow-auto rounded-md bg-[var(--background)] p-2 text-xs">
                  {JSON.stringify(item.userSubmission?.payload ?? {}, null, 2)}
                </pre>
              </div>
              {item.status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-accent px-3 py-1.5 text-xs text-white"
                    onClick={() => void decide(item.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700"
                    onClick={() => void decide(item.id, 'rejected')}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
                    onClick={() => void decide(item.id, 'escalated')}
                  >
                    Escalate
                  </button>
                </div>
              ) : null}
            </div>
          </Panel>
        ))}
      </div>
      {!loading && (data?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--muted)]">No items for this filter.</p>
      ) : null}
    </div>
  );
}
