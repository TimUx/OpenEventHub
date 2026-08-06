'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

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
  allDay?: boolean;
};

function formatAdminEventWhen(iso: string, allDay: boolean | undefined, locale: string): string {
  const tag = locale.startsWith('de') ? 'de-DE' : 'en-GB';
  if (allDay) {
    return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(iso),
    );
  }
  return new Intl.DateTimeFormat(tag, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

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

/** Calendar date from datetime-local as UTC midnight (all-day storage). */
function fromDatetimeLocalAllDay(value: string): string {
  const date = new Date(value);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

export default function EventsPage() {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<EventRow[]>(
    '/api/v1/admin/events?limit=100',
  );
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkStatus, setBulkStatus] = useState<EventStatus>('published');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const events = data ?? [];
  const eventIds = useMemo(() => events.map((event) => event.id), [events]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (eventIds.includes(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [eventIds]);

  const allSelected = events.length > 0 && selected.size === events.length;
  const selectedCount = selected.size;

  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(): void {
    setSelected(new Set(eventIds));
  }

  function clearSelection(): void {
    setSelected(new Set());
  }

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
    setAllDay(Boolean(event.allDay));
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
          allDay,
          startAt: allDay ? fromDatetimeLocalAllDay(startAt) : fromDatetimeLocal(startAt),
          endAt: endAt
            ? allDay
              ? fromDatetimeLocalAllDay(endAt)
              : fromDatetimeLocal(endAt)
            : null,
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

  async function applyBulkStatus(): Promise<void> {
    if (!token || selectedCount === 0) return;
    setBulkBusy(true);
    setFormError(null);
    try {
      const ids = [...selected];
      for (const id of ids) {
        await adminFetch(`/api/v1/admin/events/${id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ status: bulkStatus, changeReason: 'admin.bulk_status' }),
        });
      }
      setMessage(t('events.bulkStatusUpdated', { count: ids.length }));
      clearSelection();
      if (editingId && ids.includes(editingId)) {
        setStatus(bulkStatus);
      }
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBusy(false);
    }
  }

  async function applyBulkDelete(): Promise<void> {
    if (!token || selectedCount === 0) return;
    if (!window.confirm(t('events.confirmBulkDelete', { count: selectedCount }))) return;
    setBulkBusy(true);
    setFormError(null);
    try {
      const ids = [...selected];
      for (const id of ids) {
        await adminFetch(`/api/v1/admin/events/${id}`, token, { method: 'DELETE' });
      }
      setMessage(t('events.bulkDeleted', { count: ids.length }));
      if (editingId && ids.includes(editingId)) {
        setEditingId(null);
      }
      clearSelection();
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('events.title')} description={t('events.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

      <Panel className="sticky top-0 z-10 space-y-3 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="h-9 rounded-xl border border-[var(--border)] px-3 text-sm font-semibold"
            onClick={allSelected ? clearSelection : selectAll}
            disabled={events.length === 0 || bulkBusy}
          >
            {allSelected ? t('events.clearSelection') : t('events.selectAll')}
          </button>
          <span className="text-sm text-[var(--muted)]">
            {t('events.selectedCount', { count: selectedCount })}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block font-medium">{t('events.bulkStatus')}</span>
            <select
              className="h-9 min-w-44 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 text-sm"
              value={bulkStatus}
              disabled={bulkBusy}
              onChange={(e) => setBulkStatus(e.target.value as EventStatus)}
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
            className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={selectedCount === 0 || bulkBusy}
            onClick={() => void applyBulkStatus()}
          >
            {t('events.applyStatus')}
          </button>
          <button
            type="button"
            className="h-9 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 disabled:opacity-60"
            disabled={selectedCount === 0 || bulkBusy}
            onClick={() => void applyBulkDelete()}
          >
            {t('events.deleteSelected')}
          </button>
        </div>
      </Panel>

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
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--border)]"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
              />
              {t('events.fieldAllDay')}
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
        {events.map((event) => {
          const checked = selected.has(event.id);
          return (
            <Panel key={event.id} className="space-y-3">
              <div className="flex flex-wrap items-start gap-3">
                <label className="mt-1 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)]"
                    checked={checked}
                    onChange={() => toggleOne(event.id)}
                    aria-label={t('events.selectEvent', { title: event.title })}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {event.slug} · {formatAdminEventWhen(event.startAt, event.allDay, locale)}
                        {event.allDay ? ` · ${t('events.allDayBadge')}` : ''}
                      </p>
                    </div>
                    <StatusPill value={event.status} />
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                      onClick={() => startEdit(event)}
                    >
                      {t('events.edit')}
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
        {!loading && events.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t('events.empty')}</p>
        ) : null}
      </div>
    </div>
  );
}
