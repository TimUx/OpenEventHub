'use client';

import { useState, type FormEvent } from 'react';
import {
  cronFromSchedulePreset,
  DEFAULT_SCHEDULE_PRESET,
  SCHEDULE_PRESET_IDS,
  type SchedulePresetId,
} from '@openeventhub/shared';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { adminFetch } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';
import { useI18n } from '../../i18n/i18n-provider';
import { formatScheduleLabel } from '../../lib/schedule-label';

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
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Source[]>('/api/v1/admin/sources');
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [pluginType, setPluginType] = useState('rss');
  const [url, setUrl] = useState('');
  const [schedulePreset, setSchedulePreset] = useState<SchedulePresetId>(DEFAULT_SCHEDULE_PRESET);
  const [customCron, setCustomCron] = useState('');

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setMessage(null);
    const scheduleCron = cronFromSchedulePreset(schedulePreset, customCron);
    await adminFetch('/api/v1/admin/sources', token, {
      method: 'POST',
      body: JSON.stringify({ name, pluginType, url, scheduleCron }),
    });
    setName('');
    setUrl('');
    setSchedulePreset(DEFAULT_SCHEDULE_PRESET);
    setCustomCron('');
    setMessage(t('sources.created'));
    await reload();
  }

  async function crawl(id: string) {
    if (!token) return;
    setMessage(null);
    await adminFetch(`/api/v1/admin/sources/${id}/crawl`, token, { method: 'POST' });
    setMessage(t('sources.crawlEnqueued'));
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
    if (!window.confirm(t('sources.confirmDelete'))) return;
    await adminFetch(`/api/v1/admin/sources/${id}`, token, { method: 'DELETE' });
    await reload();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('sources.title')} description={t('sources.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Panel>
        <h2 className="mb-3 font-bold text-lg">{t('sources.addSource')}</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onCreate(e)}>
          <input
            className="h-10 rounded-md border border-[var(--border)] px-3"
            placeholder={t('sources.name')}
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
            placeholder={t('sources.url')}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">{t('sources.scheduleLabel')}</span>
            <select
              className="h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={schedulePreset}
              onChange={(e) => setSchedulePreset(e.target.value as SchedulePresetId)}
              aria-describedby="sources-schedule-hint"
            >
              {SCHEDULE_PRESET_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`schedule.${id}`)}
                </option>
              ))}
            </select>
            <span id="sources-schedule-hint" className="mt-1 block text-xs text-[var(--muted)]">
              {t('sources.scheduleHint')}
            </span>
          </label>
          {schedulePreset === 'custom' ? (
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">{t('sources.customCron')}</span>
              <input
                className="h-10 w-full rounded-md border border-[var(--border)] px-3 font-mono text-sm"
                placeholder="0 */6 * * *"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                required
              />
            </label>
          ) : null}
          <button type="submit" className="h-10 rounded-xl bg-primary text-white md:col-span-2">
            {t('common.create')}
          </button>
        </form>
      </Panel>

      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
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
                  {t('sources.scheduleSummary', {
                    schedule: formatScheduleLabel(t, source.scheduleCron),
                    last: source.lastCrawlAt
                      ? new Date(source.lastCrawlAt).toLocaleString()
                      : t('common.never'),
                  })}
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
                  {t('sources.crawlNow')}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  onClick={() => void disable(source.id)}
                >
                  {t('sources.disable')}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                  onClick={() => void remove(source.id)}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
