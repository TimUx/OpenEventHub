'use client';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../components/ui';

type Dashboard = {
  system: {
    users: number;
    categories: number;
    regions: number;
    activeAiProvider: { id: string; name: string; type: string; enabled: boolean } | null;
  };
  sources: Record<string, number>;
  crawls: Record<string, number>;
  moderation: Record<string, number>;
  events: Record<string, number>;
  queues: Array<{ name: string; counts: Record<string, number> }>;
  recentImports: Array<{
    id: string;
    status: string;
    source: { name: string };
    createdAt: string;
  }>;
  recentSubmissions: Array<{ id: string; type: string; status: string; createdAt: string }>;
  errors: {
    sourcesWithErrors: number;
    failedQueues: Array<{ name: string; failed: number }>;
  };
};

function CountGrid({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <Panel>
      <h2 className="mb-3 font-display text-lg">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No data</p>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2 rounded-md bg-[var(--background)] px-2 py-1.5">
              <dt className="text-[var(--muted)]">{key}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useAdminQuery<Dashboard>('/api/v1/admin/dashboard');

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="System status, crawl overview, AI, queues, and recent activity."
        action={
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => void reload()}
          >
            Refresh
          </button>
        }
      />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {data ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Panel>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Users</p>
              <p className="mt-1 text-2xl font-semibold">{data.system.users}</p>
            </Panel>
            <Panel>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Categories</p>
              <p className="mt-1 text-2xl font-semibold">{data.system.categories}</p>
            </Panel>
            <Panel>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Regions</p>
              <p className="mt-1 text-2xl font-semibold">{data.system.regions}</p>
            </Panel>
            <Panel>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Active AI</p>
              <p className="mt-1 text-lg font-semibold">
                {data.system.activeAiProvider?.name ?? 'Not configured'}
              </p>
            </Panel>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CountGrid title="Sources" data={data.sources} />
            <CountGrid title="Crawls" data={data.crawls} />
            <CountGrid title="Moderation" data={data.moderation} />
            <CountGrid title="Events" data={data.events} />
          </div>
          <Panel>
            <h2 className="mb-3 font-display text-lg">Queue status</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                    <th className="py-2">Queue</th>
                    <th>Waiting</th>
                    <th>Active</th>
                    <th>Failed</th>
                    <th>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queues.map((queue) => (
                    <tr key={queue.name} className="border-b border-[var(--border)]/60">
                      <td className="py-2 font-medium">{queue.name}</td>
                      <td>{queue.counts.waiting}</td>
                      <td>{queue.counts.active}</td>
                      <td>{queue.counts.failed}</td>
                      <td>{queue.counts.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel>
              <h2 className="mb-3 font-display text-lg">Recent imports</h2>
              <ul className="space-y-2 text-sm">
                {data.recentImports.map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-2">
                    <span>{job.source.name}</span>
                    <StatusPill value={job.status} />
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <h2 className="mb-3 font-display text-lg">Error summary</h2>
              <p className="text-sm">Sources with errors: {data.errors.sourcesWithErrors}</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                {data.errors.failedQueues.map((q) => (
                  <li key={q.name}>
                    {q.name}: {q.failed} failed
                  </li>
                ))}
                {data.errors.failedQueues.length === 0 ? <li>No failed queue jobs</li> : null}
              </ul>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
