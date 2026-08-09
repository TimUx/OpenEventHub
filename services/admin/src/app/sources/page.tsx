'use client';

import { useState, type FormEvent } from 'react';
import {
  cronFromSchedulePreset,
  DEFAULT_SCHEDULE_PRESET,
  detectSchedulePreset,
  SCHEDULE_PRESET_IDS,
  type SchedulePresetId,
} from '@openeventhub/shared';

import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { adminFetch } from '../../lib/api';
import { useAuth } from '../../components/auth-provider';
import { useI18n } from '../../i18n/i18n-provider';
import { sourceStatusLabel } from '../../i18n/labels';
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
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [pluginType, setPluginType] = useState('rss');
  const [url, setUrl] = useState('');
  const [schedulePreset, setSchedulePreset] = useState<SchedulePresetId>(DEFAULT_SCHEDULE_PRESET);
  const [customCron, setCustomCron] = useState('');
  const [status, setStatus] = useState('healthy');

  function resetForm(): void {
    setEditingId(null);
    setName('');
    setPluginType('rss');
    setUrl('');
    setSchedulePreset(DEFAULT_SCHEDULE_PRESET);
    setCustomCron('');
    setStatus('healthy');
    setFormError(null);
  }

  function startEdit(source: Source): void {
    const preset = detectSchedulePreset(source.scheduleCron);
    setEditingId(source.id);
    setName(source.name);
    setPluginType(source.pluginType);
    setUrl(source.url);
    setSchedulePreset(preset);
    setCustomCron(preset === 'custom' ? (source.scheduleCron ?? '') : '');
    setStatus(source.status === 'disabled' ? 'disabled' : 'healthy');
    setMessage(null);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    setFormError(null);
    const scheduleCron = cronFromSchedulePreset(schedulePreset, customCron);
    const body = {
      name: name.trim(),
      pluginType,
      url: url.trim(),
      scheduleCron,
      ...(editingId ? { status } : {}),
    };
    try {
      if (editingId) {
        await adminFetch(`/api/v1/admin/sources/${editingId}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setMessage(t('sources.updated'));
      } else {
        await adminFetch('/api/v1/admin/sources', token, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(t('sources.created'));
      }
      resetForm();
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function crawl(id: string): Promise<void> {
    if (!token) return;
    setMessage(null);
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/sources/${id}/crawl`, token, { method: 'POST' });
      setMessage(t('sources.crawlEnqueued'));
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function setSourceStatus(id: string, next: 'healthy' | 'disabled'): Promise<void> {
    if (!token) return;
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/sources/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setMessage(next === 'disabled' ? t('sources.disabled') : t('sources.enabled'));
      if (editingId === id) {
        setStatus(next);
      }
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove(id: string): Promise<void> {
    if (!token) return;
    if (!window.confirm(t('sources.confirmDelete'))) return;
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/sources/${id}`, token, { method: 'DELETE' });
      setMessage(t('sources.deleted'));
      if (editingId === id) {
        resetForm();
      }
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sources.title')}
        description={t('sources.description')}
        action={
          editingId ? (
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm"
              onClick={resetForm}
            >
              {t('sources.addSource')}
            </button>
          ) : null
        }
      />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

      <Panel>
        <h2 className="mb-3 font-bold text-lg">
          {editingId ? t('sources.editSource') : t('sources.addSource')}
        </h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
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
            <option value="toubiz">toubiz</option>
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
          {editingId ? (
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">{t('sources.status')}</span>
              <select
                className="h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="healthy">{t('sources.statuses.healthy')}</option>
                <option value="disabled">{t('sources.statuses.disabled')}</option>
              </select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-xl bg-primary px-4 text-white disabled:opacity-60"
            >
              {editingId ? t('sources.saveChanges') : t('common.create')}
            </button>
            {editingId ? (
              <button
                type="button"
                className="h-10 rounded-xl border border-[var(--border)] px-4"
                onClick={resetForm}
              >
                {t('common.cancel')}
              </button>
            ) : null}
          </div>
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
                <StatusPill value={sourceStatusLabel(t, source.status)} />
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  onClick={() => startEdit(source)}
                >
                  {t('common.edit')}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                  onClick={() => void crawl(source.id)}
                >
                  {t('sources.crawlNow')}
                </button>
                {source.status === 'disabled' ? (
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                    onClick={() => void setSourceStatus(source.id, 'healthy')}
                  >
                    {t('sources.enable')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                    onClick={() => void setSourceStatus(source.id, 'disabled')}
                  >
                    {t('sources.disable')}
                  </button>
                )}
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
