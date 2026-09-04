'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { eventStatusLabel } from '../../i18n/labels';
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
  venue?: {
    id: string;
    name: string;
    city: string | null;
    address: string | null;
    regionId?: string | null;
  } | null;
  categories?: ReadonlyArray<{
    category: { id: string; name: string; slug: string };
  }>;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type VenueSuggestion = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  regionId?: string | null;
  kind: 'venue' | 'region';
};

type RegionRow = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
};

type EventFilters = {
  status: '' | EventStatus;
  dateFrom: string;
  dateTo: string;
  q: string;
  venue: string;
  /** Category id — applied client-side on loaded rows (list API has no category filter). */
  category: string;
  allDay: '' | 'true' | 'false';
};

type SortKey = 'title' | 'startAt' | 'venue' | 'category' | 'status' | 'allDay';
type SortDir = 'asc' | 'desc';

const EMPTY_FILTERS: EventFilters = {
  status: '',
  dateFrom: '',
  dateTo: '',
  q: '',
  venue: '',
  category: '',
  allDay: '',
};

const inputClass =
  'h-7 w-full min-w-0 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs';

function buildEventsPath(filters: EventFilters): string {
  const params = new URLSearchParams();
  params.set('limit', '200');
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const q = filters.q.trim();
  if (q) params.set('q', q);
  const venue = filters.venue.trim();
  if (venue) params.set('venue', venue);
  if (filters.allDay) params.set('allDay', filters.allDay);
  return `/api/v1/admin/events?${params.toString()}`;
}

function filtersActive(filters: EventFilters): boolean {
  return Boolean(
    filters.status ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.q.trim() ||
    filters.venue.trim() ||
    filters.category ||
    filters.allDay,
  );
}

function regionTypeLabel(type: string, t: (key: string) => string): string {
  if (type === 'suburb' || type === 'city' || type === 'town' || type === 'village') {
    return t('events.regionTypeSuburb');
  }
  if (type === 'municipality' || type === 'county' || type === 'state' || type === 'country') {
    return type === 'municipality'
      ? t('events.regionTypeMunicipality')
      : t('events.regionTypeOther');
  }
  return t('events.regionTypeOther');
}

function formatVenue(
  venue: EventRow['venue'],
  regionById: ReadonlyMap<string, RegionRow>,
): { primary: string; secondary: string; title: string } {
  if (!venue) return { primary: '', secondary: '', title: '' };
  const locality = venue.name?.trim() || venue.city?.trim() || '';
  const address = venue.address?.trim() || '';
  const region = venue.regionId ? regionById.get(venue.regionId) : undefined;
  const ort = region?.name?.trim() || '';
  const primary =
    locality && ort && locality.toLowerCase() !== ort.toLowerCase()
      ? `${locality} · ${ort}`
      : locality || ort;
  const secondary = address && address.toLowerCase() !== locality.toLowerCase() ? address : '';
  const title = [primary, secondary].filter(Boolean).join('\n');
  return { primary, secondary, title };
}

function categoryNames(categories: EventRow['categories']): string[] {
  return (categories ?? [])
    .map((row) => row.category.name.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function formatCategories(categories: EventRow['categories']): string {
  return categoryNames(categories).join(', ');
}

function eventHasCategory(event: EventRow, categoryId: string): boolean {
  if (!categoryId) return true;
  return (event.categories ?? []).some((row) => row.category.id === categoryId);
}

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

function compareEvents(
  a: EventRow,
  b: EventRow,
  key: SortKey,
  dir: SortDir,
  regionById: ReadonlyMap<string, RegionRow>,
): number {
  const mul = dir === 'asc' ? 1 : -1;
  let left = '';
  let right = '';
  switch (key) {
    case 'title':
      left = a.title;
      right = b.title;
      break;
    case 'startAt':
      left = a.startAt;
      right = b.startAt;
      break;
    case 'venue':
      left = formatVenue(a.venue, regionById).primary;
      right = formatVenue(b.venue, regionById).primary;
      break;
    case 'category':
      left = formatCategories(a.categories);
      right = formatCategories(b.categories);
      break;
    case 'status':
      left = a.status;
      right = b.status;
      break;
    case 'allDay':
      left = a.allDay ? '1' : '0';
      right = b.allDay ? '1' : '0';
      break;
  }
  return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }) * mul;
}

export default function EventsPage() {
  const { t, locale } = useI18n();
  const { token } = useAuth();
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('startAt');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedFilters(filters), 300);
    return () => window.clearTimeout(handle);
  }, [filters]);

  const eventsPath = useMemo(() => buildEventsPath(debouncedFilters), [debouncedFilters]);
  const { data, error, loading, reload } = useAdminQuery<EventRow[]>(eventsPath);
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
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueRegionId, setVenueRegionId] = useState<string | null>(null);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [venueLookupBusy, setVenueLookupBusy] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const { data: regionsData } = useAdminQuery<RegionRow[]>('/api/v1/admin/regions');
  const { data: categoriesData } = useAdminQuery<CategoryRow[]>('/api/v1/admin/categories');

  const regionById = useMemo(() => {
    const map = new Map<string, RegionRow>();
    for (const region of regionsData ?? []) {
      map.set(region.id, region);
    }
    return map;
  }, [regionsData]);

  const placeRegionOptions = useMemo(() => {
    const placeTypes = new Set(['suburb', 'municipality', 'city', 'town', 'village']);
    const rows = [...(regionsData ?? [])].filter((region) => placeTypes.has(region.type));
    if (venueRegionId && !rows.some((region) => region.id === venueRegionId)) {
      const linked = regionById.get(venueRegionId);
      if (linked) rows.push(linked);
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [regionsData, regionById, venueRegionId]);

  const events = useMemo(() => {
    const categoryId = debouncedFilters.category;
    const rows = (data ?? []).filter((event) => eventHasCategory(event, categoryId));
    rows.sort((a, b) => compareEvents(a, b, sortKey, sortDir, regionById));
    return rows;
  }, [data, debouncedFilters.category, sortKey, sortDir, regionById]);

  const categoryOptions = useMemo(() => {
    return [...(categoriesData ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [categoriesData]);

  const eventIds = useMemo(() => events.map((event) => event.id), [events]);
  const hasFilters = filtersActive(debouncedFilters);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (eventIds.includes(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [eventIds]);

  useEffect(() => {
    if (!token || !editingId) {
      setVenueSuggestions([]);
      return;
    }
    const q = venueName.trim();
    if (q.length < 2) {
      setVenueSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      setVenueLookupBusy(true);
      void adminFetch<Array<Omit<VenueSuggestion, 'kind'>>>(
        `/api/v1/admin/venues?q=${encodeURIComponent(q)}&limit=20`,
        token,
      )
        .then((rows) => {
          setVenueSuggestions(
            rows.map((row) => ({
              ...row,
              kind: 'venue' as const,
            })),
          );
        })
        .catch(() => setVenueSuggestions([]))
        .finally(() => setVenueLookupBusy(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [token, editingId, venueName]);

  const allSelected = events.length > 0 && selected.size === events.length;
  const selectedCount = selected.size;

  function patchFilter<K extends keyof EventFilters>(key: K, value: EventFilters[K]): void {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters(): void {
    setFilters(EMPTY_FILTERS);
    setDebouncedFilters(EMPTY_FILTERS);
    setSelected(new Set());
  }

  function toggleSort(key: SortKey): void {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }

  function sortIndicator(key: SortKey): string {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function toggleOne(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(): void {
    setSelected(allSelected ? new Set() : new Set(eventIds));
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
    setVenueId(event.venue?.id ?? null);
    setVenueRegionId(event.venue?.regionId ?? null);
    // Ort = place name (legacy city falls back when name was empty)
    setVenueName(event.venue?.name?.trim() || event.venue?.city?.trim() || '');
    setVenueAddress(event.venue?.address ?? '');
    setCategoryIds((event.categories ?? []).map((row) => row.category.id));
    setVenueSuggestions([]);
    setChangeReason('');
    setMessage(null);
    setFormError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setFormError(null);
    setVenueSuggestions([]);
  }

  function clearVenueFields(): void {
    setVenueId(null);
    setVenueRegionId(null);
    setVenueName('');
    setVenueAddress('');
    setVenueSuggestions([]);
  }

  function pickVenueSuggestion(suggestion: VenueSuggestion): void {
    setVenueId(suggestion.id);
    setVenueRegionId(suggestion.regionId ?? null);
    setVenueName(suggestion.name);
    setVenueAddress(suggestion.address ?? '');
    setVenueSuggestions([]);
  }

  async function onSave(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!token || !editingId) return;
    setSaving(true);
    setFormError(null);
    try {
      const trimmedVenueName = venueName.trim();
      const venuePayload = trimmedVenueName
        ? {
            ...(venueId ? { id: venueId } : {}),
            name: trimmedVenueName,
            city: null,
            address: venueAddress.trim() || null,
            regionId: venueRegionId,
          }
        : null;

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
          venue: venuePayload,
          categoryIds,
          changeReason: changeReason.trim() || null,
        }),
      });
      setMessage(t('events.updated'));
      setEditingId(null);
      setVenueSuggestions([]);
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
      const result = await adminFetch<{ updated: number }>(
        '/api/v1/admin/events/bulk-status',
        token,
        {
          method: 'PATCH',
          body: JSON.stringify({ ids, status: bulkStatus, changeReason: 'admin.bulk_status' }),
        },
      );
      setMessage(t('events.bulkStatusUpdated', { count: result.updated }));
      setSelected(new Set());
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
      const result = await adminFetch<{ deleted: number }>(
        '/api/v1/admin/events/bulk-delete',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
        },
      );
      setMessage(t('events.bulkDeleted', { count: result.deleted }));
      if (editingId && ids.includes(editingId)) {
        setEditingId(null);
      }
      setSelected(new Set());
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('events.title')} description={t('events.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-xs">
          <span className="text-[var(--muted)]">
            {t('events.selectedCount', { count: selectedCount })}
          </span>
          <select
            className="h-7 rounded border border-[var(--border)] bg-[var(--background)] px-1.5"
            value={bulkStatus}
            disabled={bulkBusy}
            aria-label={t('events.bulkStatus')}
            onChange={(e) => setBulkStatus(e.target.value as EventStatus)}
          >
            {EVENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`events.status.${value}`)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="h-7 rounded bg-primary px-2 font-semibold text-white disabled:opacity-60"
            disabled={bulkBusy}
            onClick={() => void applyBulkStatus()}
          >
            {t('events.applyStatus')}
          </button>
          <button
            type="button"
            className="h-7 rounded border border-red-200 px-2 font-semibold text-red-700 disabled:opacity-60"
            disabled={bulkBusy}
            onClick={() => void applyBulkDelete()}
          >
            {t('events.deleteSelected')}
          </button>
          <button
            type="button"
            className="h-7 rounded border border-[var(--border)] px-2 disabled:opacity-60"
            disabled={bulkBusy}
            onClick={() => setSelected(new Set())}
          >
            {t('events.clearSelection')}
          </button>
        </div>
      ) : null}

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
            <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
              <label className="relative text-sm md:col-span-2">
                {t('events.fieldVenueLocality')}
                <input
                  className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                  value={venueName}
                  list="event-venue-suggestions"
                  placeholder={t('events.venuePlacePlaceholder')}
                  autoComplete="off"
                  onChange={(e) => {
                    const value = e.target.value;
                    setVenueName(value);
                    const match = venueSuggestions.find(
                      (suggestion) => suggestion.name.toLowerCase() === value.trim().toLowerCase(),
                    );
                    if (match) {
                      pickVenueSuggestion(match);
                      return;
                    }
                    setVenueId(null);
                  }}
                />
                <datalist id="event-venue-suggestions">
                  {venueSuggestions.map((suggestion) => (
                    <option
                      key={`${suggestion.kind}-${suggestion.id}`}
                      value={suggestion.name}
                      label={suggestion.address || t('events.venueSuggestionVenue')}
                    />
                  ))}
                </datalist>
                {venueLookupBusy ? (
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {t('common.loading')}
                  </span>
                ) : null}
                {venueSuggestions.length > 0 ? (
                  <ul className="mt-1 max-h-40 overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] text-sm shadow-sm">
                    {venueSuggestions.map((suggestion) => (
                      <li key={`${suggestion.kind}-${suggestion.id}`}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[var(--background)]"
                          onClick={() => pickVenueSuggestion(suggestion)}
                        >
                          <span className="font-medium">{suggestion.name}</span>
                          <span className="text-xs text-[var(--muted)]">
                            {suggestion.address || t('events.venueSuggestionVenue')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
              <label className="text-sm md:col-span-2">
                {t('events.fieldVenueRegion')}
                <select
                  className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                  value={venueRegionId ?? ''}
                  onChange={(e) => setVenueRegionId(e.target.value || null)}
                >
                  <option value="">{t('events.venueRegionNone')}</option>
                  {placeRegionOptions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name} · {regionTypeLabel(region.type, t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                {t('events.fieldVenueAddress')}
                <input
                  className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                  value={venueAddress}
                  placeholder={t('events.venueAddressPlaceholder')}
                  onChange={(e) => setVenueAddress(e.target.value)}
                />
              </label>
              {venueId || venueRegionId || venueName.trim() || venueAddress.trim() ? (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
                    onClick={clearVenueFields}
                  >
                    {t('events.clearVenue')}
                  </button>
                </div>
              ) : null}
            </div>
            <label className="text-sm md:col-span-2">
              {t('events.fieldCategories')}
              <select
                className="mt-1 min-h-28 w-full rounded-md border border-[var(--border)] px-3 py-2"
                multiple
                value={categoryIds}
                aria-label={t('events.fieldCategories')}
                onChange={(e) => {
                  const selected = [...e.target.selectedOptions].map((option) => option.value);
                  setCategoryIds(selected);
                }}
              >
                {(categoriesData ?? [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <span className="mt-1 block text-xs text-[var(--muted)]">
                {t('events.categoriesHint')}
              </span>
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

      <Panel className="overflow-x-auto !p-0">
        <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
          <thead className="bg-[var(--background)]">
            <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
              <th className="w-10 px-2 py-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-[var(--border)]"
                  checked={allSelected}
                  disabled={events.length === 0 || bulkBusy}
                  onChange={toggleSelectAll}
                  aria-label={allSelected ? t('events.clearSelection') : t('events.selectAll')}
                />
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('title')}
                >
                  {t('events.colTitle')}
                  {sortIndicator('title')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('startAt')}
                >
                  {t('events.colStart')}
                  {sortIndicator('startAt')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('venue')}
                >
                  {t('events.colVenue')}
                  {sortIndicator('venue')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('category')}
                >
                  {t('events.colCategory')}
                  {sortIndicator('category')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('status')}
                >
                  {t('events.colStatus')}
                  {sortIndicator('status')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('allDay')}
                >
                  {t('events.colAllDay')}
                  {sortIndicator('allDay')}
                </button>
              </th>
              <th className="w-20 px-2 py-1.5 font-semibold">{t('events.colActions')}</th>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-1" />
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.q}
                  placeholder={t('events.filterSearchPlaceholder')}
                  aria-label={t('events.filterSearch')}
                  onChange={(e) => patchFilter('q', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <div className="flex gap-1">
                  <input
                    type="date"
                    className={inputClass}
                    value={filters.dateFrom}
                    aria-label={t('events.filterDateFrom')}
                    onChange={(e) => patchFilter('dateFrom', e.target.value)}
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={filters.dateTo}
                    aria-label={t('events.filterDateTo')}
                    onChange={(e) => patchFilter('dateTo', e.target.value)}
                  />
                </div>
              </th>
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.venue}
                  placeholder={t('events.filterVenuePlaceholder')}
                  aria-label={t('events.filterVenue')}
                  onChange={(e) => patchFilter('venue', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <select
                  className={inputClass}
                  value={filters.category}
                  aria-label={t('events.filterCategory')}
                  onChange={(e) => patchFilter('category', e.target.value)}
                >
                  <option value="">{t('events.filterAnyCategory')}</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-2 py-1">
                <select
                  className={inputClass}
                  value={filters.status}
                  aria-label={t('events.filterStatus')}
                  onChange={(e) => patchFilter('status', e.target.value as EventFilters['status'])}
                >
                  <option value="">{t('events.filterAnyStatus')}</option>
                  {EVENT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {t(`events.status.${value}`)}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-2 py-1">
                <select
                  className={inputClass}
                  value={filters.allDay}
                  aria-label={t('events.filterAllDay')}
                  onChange={(e) => patchFilter('allDay', e.target.value as EventFilters['allDay'])}
                >
                  <option value="">{t('events.filterAnyAllDay')}</option>
                  <option value="true">{t('events.filterAllDayYes')}</option>
                  <option value="false">{t('events.filterAllDayNo')}</option>
                </select>
              </th>
              <th className="px-2 py-1">
                {hasFilters || filtersActive(filters) ? (
                  <button
                    type="button"
                    className="h-7 text-xs text-[var(--muted)] underline-offset-2 hover:underline"
                    onClick={clearFilters}
                  >
                    {t('events.clearFilters')}
                  </button>
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const checked = selected.has(event.id);
              const venueLabel = formatVenue(event.venue, regionById);
              const names = categoryNames(event.categories);
              return (
                <tr
                  key={event.id}
                  className={`border-b border-[var(--border)]/60 hover:bg-[var(--background)]/80 ${
                    checked ? 'bg-primary-soft/40' : ''
                  } ${editingId === event.id ? 'bg-primary-soft/60' : ''}`}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-[var(--border)]"
                      checked={checked}
                      onChange={() => toggleOne(event.id)}
                      aria-label={t('events.selectEvent', { title: event.title })}
                    />
                  </td>
                  <td className="max-w-[16rem] px-2 py-1.5">
                    <p className="truncate font-medium" title={event.title}>
                      {event.title}
                    </p>
                    <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                      {event.slug}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs">
                    {formatAdminEventWhen(event.startAt, event.allDay, locale)}
                  </td>
                  <td
                    className="max-w-[14rem] px-2 py-1.5 text-xs"
                    title={venueLabel.title || undefined}
                  >
                    {venueLabel.primary ? (
                      <>
                        <p className="truncate">{venueLabel.primary}</p>
                        {venueLabel.secondary ? (
                          <p className="truncate text-[11px] text-[var(--muted)]">
                            {venueLabel.secondary}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[14rem] px-2 py-1.5" title={names.join(', ') || undefined}>
                    {(event.categories ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {[...(event.categories ?? [])]
                          .sort((a, b) =>
                            a.category.name.localeCompare(b.category.name, undefined, {
                              sensitivity: 'base',
                            }),
                          )
                          .map((row) => (
                            <span
                              key={row.category.id}
                              className="inline-flex max-w-full truncate rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[11px] text-[var(--muted)]"
                            >
                              {row.category.name}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <StatusPill value={eventStatusLabel(t, event.status)} />
                  </td>
                  <td className="px-2 py-1.5 text-xs text-[var(--muted)]">
                    {event.allDay ? t('events.allDayBadge') : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      className="rounded border border-[var(--border)] px-1.5 py-0.5 text-xs"
                      onClick={() => startEdit(event)}
                    >
                      {t('events.edit')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && events.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">
            {hasFilters ? t('events.emptyFiltered') : t('events.empty')}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
