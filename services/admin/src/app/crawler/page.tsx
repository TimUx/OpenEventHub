'use client';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';

type CrawlJob = {
  id: string;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  source: { id: string; name: string };
};

export default function CrawlerPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useAdminQuery<CrawlJob[]>(
    '/api/v1/admin/crawler/jobs?limit=100',
  );

  return (
    <div>
      <PageHeader
        title={t('crawler.title')}
        description={t('crawler.description')}
        action={
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => void reload()}
          >
            {t('common.refresh')}
          </button>
        }
      />
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Panel className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              <th className="py-2">{t('crawler.source')}</th>
              <th>{t('crawler.status')}</th>
              <th>{t('crawler.scheduled')}</th>
              <th>{t('crawler.error')}</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((job) => (
              <tr key={job.id} className="border-b border-[var(--border)]/50">
                <td className="py-2">{job.source.name}</td>
                <td>
                  <StatusPill value={job.status} />
                </td>
                <td>{new Date(job.scheduledAt).toLocaleString()}</td>
                <td className="text-red-700">{job.errorMessage ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && (data?.length ?? 0) === 0 ? (
          <p className="py-4 text-sm text-[var(--muted)]">{t('crawler.empty')}</p>
        ) : null}
      </Panel>
    </div>
  );
}
