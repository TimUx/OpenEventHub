'use client';

import { PageHeader, Panel, useAdminQuery } from '../../components/ui';

type QueueRow = {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
};

export default function QueuesPage() {
  const { data, error, loading, reload } = useAdminQuery<QueueRow[]>('/api/v1/admin/queues');

  return (
    <div>
      <PageHeader
        title="Queues"
        description="BullMQ visibility across discovery, crawl, OCR, AI, and more."
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((queue) => (
          <Panel key={queue.name}>
            <h2 className="font-display text-lg">{queue.name}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(queue.counts).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between rounded-md bg-[var(--background)] px-2 py-1"
                >
                  <dt className="text-[var(--muted)]">{key}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </div>
    </div>
  );
}
