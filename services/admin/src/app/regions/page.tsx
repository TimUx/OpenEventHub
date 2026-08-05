'use client';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';

type Region = {
  id: string;
  name: string;
  slug: string;
  type: string;
  parentId: string | null;
};

export default function RegionsPage() {
  const { data, error, loading } = useAdminQuery<Region[]>('/api/v1/admin/regions');

  return (
    <div>
      <PageHeader title="Regions" description="Geographic hierarchy for filtering." />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        {(data ?? []).map((item) => (
          <Panel key={item.id} className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-[var(--muted)]">{item.slug}</p>
            </div>
            <StatusPill value={item.type} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
