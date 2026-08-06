'use client';

import { useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

const EVENT_STATUSES = [
  'draft',
  'pending_moderation',
  'published',
  'archived',
  'rejected',
] as const;

type EventStatus = (typeof EVENT_STATUSES)[number];

type EventRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string | null;
  status: string;
  startAt: string;
  endAt: string | null;
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export default function EventsPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<EventRow[]>(
    '/api/v1/admin/events?limit=100',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [changeReason, setChangeReason] = useState('');

  function startEdit(event: EventRow): void {
    setEditingId(event.id);
    setTitle(event.title);
    setSlug(event.slug);
    setSummary(event.summary ?? '');
    setDescription(event.description ?? '');
    setStatus(
      (EVENT_STATUSES.includes(event.status as EventStatus)
        ? event.status
        : 'draft') as EventStatus,
    );
    setStartAt(toDatetimeLocal(event.startAt));
    setEndAt(toDatetimeLocal(event.endAt));
    setChangeReason('');
    setMessage(null);
    setFormError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setFormError(null);
  }

  async function onSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!token || !editingId) return;
    setSaving(true);
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/events/${editingId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          summary: summary.trim() || null,
          description: description.trim() || null,
          status,
          startAt: fromDatetimeLocal(startAt),
          endAt: endAt ? fromDatetimeLocal(endAt) : null,
          changeReason: changeReason.trim() || null,
        }),
      });
      setMessage(t('events.updated'));
      setEditingId(null);
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(eventId: string, next: EventStatus): Promise<void> {
    if (!token) return;
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/events/${eventId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: next, changeReason: 'admin.status' }),
      });
      setMessage(t('events.statusUpdated'));
      if (editingId === eventId) {
        setStatus(next);
      }
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove(event: EventRow): Promise<void> {
    if (!token) return;
    if (!window.confirm(t('events.confirmDelete', { title: event.title }))) return;
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/events/${event.id}`, token, { method: 'DELETE' });
      setMessage(t('events.deleted'));
      if (editingId === event.id) {
        setEditingId(null);
      }
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('events.title')} description={t('events.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

      {editingId ? (
        <Panel>
          <h2 className="mb-3 font-bold text-lg">{t('events.editEvent')}</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSave(e)}>
            <label className="text-sm md:col-span-2">
              {t('events.fieldTitle')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={title}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t('events.fieldSlug')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-mono text-sm"
                value={slug}
                required
                onChange={(e) => setSlug(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t('events.fieldStatus')}
              <select
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
              >
                {EVENT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`events.status.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t('events.fieldStartAt')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                type="datetime-local"
                value={startAt}
                required
                onChange={(e) => setStartAt(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t('events.fieldEndAt')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              {t('events.fieldSummary')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              {t('events.fieldDescription')}
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="text-sm md:col-span-2">
              {t('events.fieldChangeReason')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={changeReason}
                placeholder={t('events.changeReasonPlaceholder')}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-xl bg-primary px-4 text-white disabled:opacity-60"
              >
                {t('events.saveChanges')}
              </button>
              <button
                type="button"
                className="h-10 rounded-xl border border-[var(--border)] px-4"
                onClick={cancelEdit}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="space-y-2">
        {(data ?? []).map((event) => (
          <Panel key={event.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{event.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {event.slug} · {new Date(event.startAt).toLocaleString()}
                </p>
              </div>
              <StatusPill value={event.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                {t('events.fieldStatus')}
                <select
                  className="h-8 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--foreground)]"
                  value={
                    EVENT_STATUSES.includes(event.status as EventStatus) ? event.status : 'draft'
                  }
                  onChange={(e) => void quickStatus(event.id, e.target.value as EventStatus)}
                  aria-label={t('events.changeStatus')}
                >
                  {EVENT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {t(`events.status.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                onClick={() => startEdit(event)}
              >
                {t('events.edit')}
              </button>
              <button
                type="button"
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() => void remove(event)}
              >
                {t('common.delete')}
              </button>
            </div>
          </Panel>
        ))}
        {!loading && (data?.length ?? 0) === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('events.empty')}</p>
        ) : null}
      </div>
    </div>
  );
}
