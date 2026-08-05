'use client';

import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';

type Category = { id: string; name: string; slug: string; parentId: string | null };

export default function CategoriesPage() {
  const { t } = useI18n();
  const { data, error, loading } = useAdminQuery<Category[]>('/api/v1/admin/categories');

  return (
    <div>
      <PageHeader title={t('categories.title')} description={t('categories.description')} />
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
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
