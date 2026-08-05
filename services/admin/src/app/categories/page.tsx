'use client';

import { PageHeader, Panel, useAdminQuery } from '../../components/ui';

type Category = { id: string; name: string; slug: string; parentId: string | null };

export default function CategoriesPage() {
  const { data, error, loading } = useAdminQuery<Category[]>('/api/v1/admin/categories');

  return (
    <div>
      <PageHeader title="Categories" description="Taxonomy used for classification and search." />
      {loading ? <p className="text-sm text-[var(--muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        {(data ?? []).map((item) => (
          <Panel key={item.id}>
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-[var(--muted)]">{item.slug}</p>
          </Panel>
        ))}
      </div>
    </div>
  );
}
