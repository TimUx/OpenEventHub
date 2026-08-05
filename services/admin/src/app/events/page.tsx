'use client';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';

type EventRow = {
  id: string;
  title: string;
  status: string;
  startAt: string;
  slug: string;
};

export default function EventsPage() {
  const { t } = useI18n();
  const { data, error, loading } = useAdminQuery<EventRow[]>('/api/v1/admin/events?limit=100');

  return (
    <div>
      <PageHeader title={t('events.title')} description={t('events.description')} />
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="space-y-2">
        {(data ?? []).map((event) => (
          <Panel key={event.id} className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{event.title}</p>
              <p className="text-xs text-[var(--muted)]">
                {event.slug} · {new Date(event.startAt).toLocaleString()}
              </p>
            </div>
            <StatusPill value={event.status} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
