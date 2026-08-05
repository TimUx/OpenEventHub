'use client';

import { useState, type FormEvent } from 'react';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { adminFetch } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';

type Source = {
  id: string;
  name: string;
  pluginType: string;
  url: string;
  scheduleCron: string | null;
  status: string;
  lastCrawlAt: string | null;
  lastError: string | null;
};

export default function SourcesPage() {
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Source[]>('/api/v1/admin/sources');
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pluginType, setPluginType] = useState('rss');
  const [url, setUrl] = useState('');
  const [scheduleCron, setScheduleCron] = useState('0 */6 * * *');

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage(null);
    await adminFetch('/api/v1/admin/sources', token, {
      method: 'POST',
      body: JSON.stringify({ name, pluginType, url, scheduleCron: scheduleCron || null }),
    });
    setName('');
    setUrl('');
    setMessage('Source created');
    await reload();
  }

  async function crawl(id: string) {
    if (!token) return;
    setMessage(null);
    await adminFetch(`/api/v1/admin/sources/${id}/crawl`, token, { method: 'POST' });
    setMessage('Crawl enqueued');
    await reload();
  }

  async function disable(id: string) {
    if (!token) return;
    await adminFetch(`/api/v1/admin/sources/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'disabled' }),
    });
    await reload();
  }

  async function remove(id: string) {
    if (!token) return;
    if (!window.confirm('Delete this source?')) return;
    await adminFetch(`/api/v1/admin/sources/${id}`, token, { method: 'DELETE' });
    await reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sources"
        description="Manage crawl sources, schedules, and manual triggers."
      />
      {message ? <p className="text-sm text-accent">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Panel>
        <h2 className="mb-3 font-display text-lg">Add source</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onCreate(e)}>
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="h-10 rounded-md border border-[var(--border)] px-3"
            value={pluginType}
            onChange={(e) => setPluginType(e.target.value)}
          >
            <option value="rss">rss</option>
            <option value="html">html</option>
            <option value="ics">ics</option>
          </select>
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3 md:col-span-2"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder="Cron (UTC)"
            value={scheduleCron}
            onChange={(e) => setScheduleCron(e.target.value)}
          />
          <button type="submit" className="h-10 rounded-md bg-accent text-white">
            Create
          </button>
        </form>
      </Panel>

      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      <div className="space-y-3">
        {(data ?? []).map((source) => (
          <Panel key={source.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{source.name}</h3>
                <p className="text-sm text-[var(--muted)]">
                  {source.pluginType} · {source.url}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Cron: {source.scheduleCron ?? '—'} · Last crawl:{' '}
                  {source.lastCrawlAt ? new Date(source.lastCrawlAt).toLocaleString() : 'never'}
                </p>
                {source.lastError ? (
                  <p className="mt-1 text-xs text-red-700">{source.lastError}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill value={source.status} />
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  onClick={() => void crawl(source.id)}
                >
                  Crawl now
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  onClick={() => void disable(source.id)}
                >
                  Disable
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                  onClick={() => void remove(source.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
