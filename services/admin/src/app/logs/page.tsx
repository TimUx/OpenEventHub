'use client';

import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';

type ErrorLogEntry = {
  id: string;
  kind: 'queue' | 'crawl' | 'source';
  subject: string;
  reason: string;
  detail: string | null;
  occurredAt: string | null;
};

export default function LogsPage() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useAdminQuery<ErrorLogEntry[]>(
    '/api/v1/admin/logs/errors?limit=100',
  );

  return (
    <div>
      <PageHeader
        title={t('logs.title')}
        description={t('logs.description')}
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

      <Panel>
        {(data?.length ?? 0) === 0 && !loading ? (
          <p className="text-sm text-[var(--muted)]">{t('logs.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th className="py-2 pr-3 font-semibold">{t('logs.when')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('logs.kind')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('logs.subject')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('logs.reason')}</th>
                  <th className="py-2 font-semibold">{t('logs.detail')}</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border)]/60 align-top">
                    <td className="whitespace-nowrap py-2.5 pr-3 text-[var(--muted)]">
                      {entry.occurredAt
                        ? new Date(entry.occurredAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="rounded-md bg-[var(--background)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                        {t(`logs.kinds.${entry.kind}`)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium">{entry.subject}</td>
                    <td className="max-w-md break-words py-2.5 pr-3 text-red-800">{entry.reason}</td>
                    <td className="max-w-xs break-words py-2.5 text-xs text-[var(--muted)]">
                      {entry.detail ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
