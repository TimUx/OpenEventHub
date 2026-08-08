'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

const REGION_TYPES = ['country', 'state', 'district', 'municipality', 'suburb', 'city'] as const;

type RegionType = (typeof REGION_TYPES)[number];

type Region = {
  id: string;
  name: string;
  slug: string;
  type: string;
  parentId: string | null;
  isoCode: string | null;
};

type RegionFilters = {
  name: string;
  slug: string;
  type: '' | RegionType;
  parent: string;
  iso: string;
};

type SortKey = 'name' | 'slug' | 'type' | 'parent' | 'iso';
type SortDir = 'asc' | 'desc';

type HierarchyNode = {
  type: RegionType;
  name: string;
  isoCode: string | null;
};

type LookupCandidate = {
  id: string;
  label: string;
  name: string;
  leafType: RegionType;
  chain: HierarchyNode[];
  lat: number | null;
  lon: number | null;
};

const EMPTY_FILTERS: RegionFilters = {
  name: '',
  slug: '',
  type: '',
  parent: '',
  iso: '',
};

const inputClass =
  'h-7 w-full min-w-0 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs';

function filtersActive(filters: RegionFilters): boolean {
  return Boolean(
    filters.name.trim() ||
    filters.slug.trim() ||
    filters.type ||
    filters.parent.trim() ||
    filters.iso.trim(),
  );
}

function regionTypeLabelKey(type: string): `regions.type.${RegionType}` {
  const normalized = type === 'city' ? 'municipality' : type;
  if ((REGION_TYPES as readonly string[]).includes(normalized)) {
    return `regions.type.${normalized as RegionType}`;
  }
  return 'regions.type.municipality';
}

export default function RegionsPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Region[]>('/api/v1/admin/regions');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<RegionFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<RegionType>('suburb');
  const [parentId, setParentId] = useState('');
  const [isoCode, setIsoCode] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [candidates, setCandidates] = useState<LookupCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const byId = useMemo(() => new Map((data ?? []).map((item) => [item.id, item])), [data]);
  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );

  function parentLabel(id: string | null): string {
    if (!id) return t('regions.noParent');
    return byId.get(id)?.name ?? id;
  }

  const rows = useMemo(() => {
    const nameQ = filters.name.trim().toLowerCase();
    const slugQ = filters.slug.trim().toLowerCase();
    const parentQ = filters.parent.trim().toLowerCase();
    const isoQ = filters.iso.trim().toLowerCase();
    const filtered = (data ?? []).filter((item) => {
      if (nameQ && !item.name.toLowerCase().includes(nameQ)) return false;
      if (slugQ && !item.slug.toLowerCase().includes(slugQ)) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (parentQ) {
        const label = parentLabel(item.parentId).toLowerCase();
        if (!label.includes(parentQ)) return false;
      }
      if (isoQ && !(item.isoCode ?? '').toLowerCase().includes(isoQ)) return false;
      return true;
    });
    const mul = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let left = '';
      let right = '';
      switch (sortKey) {
        case 'slug':
          left = a.slug;
          right = b.slug;
          break;
        case 'type':
          left = a.type;
          right = b.type;
          break;
        case 'parent':
          left = parentLabel(a.parentId);
          right = parentLabel(b.parentId);
          break;
        case 'iso':
          left = a.isoCode ?? '';
          right = b.isoCode ?? '';
          break;
        default:
          left = a.name;
          right = b.name;
      }
      return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }) * mul;
    });
    return filtered;
  }, [data, filters, sortKey, sortDir, byId, t]);

  useEffect(() => {
    if (!token || editingId || manualMode || !formOpen) {
      return;
    }
    const q = name.trim();
    if (q.length < 2) {
      setCandidates([]);
      setSelectedCandidateId(null);
      setLookupLoading(false);
      return;
    }

    let cancelled = false;
    setLookupLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await adminFetch<{ candidates: LookupCandidate[] }>(
            `/api/v1/admin/regions/lookup?q=${encodeURIComponent(q)}`,
            token,
          );
          if (cancelled) return;
          const list = result.candidates ?? [];
          setCandidates(list);
          setSelectedCandidateId(list.length === 1 ? (list[0]?.id ?? null) : null);
        } catch (err) {
          if (cancelled) return;
          setCandidates([]);
          setSelectedCandidateId(null);
          setFormError(err instanceof Error ? err.message : String(err));
        } finally {
          if (!cancelled) setLookupLoading(false);
        }
      })();
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, token, editingId, manualMode, formOpen]);

  function patchFilter<K extends keyof RegionFilters>(key: K, value: RegionFilters[K]): void {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters(): void {
    setFilters(EMPTY_FILTERS);
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

  function resetForm(): void {
    setEditingId(null);
    setFormOpen(false);
    setName('');
    setSlug('');
    setType('suburb');
    setParentId('');
    setIsoCode('');
    setSlugTouched(false);
    setManualMode(false);
    setCandidates([]);
    setSelectedCandidateId(null);
    setLookupLoading(false);
    setFormError(null);
  }

  function startCreate(): void {
    setEditingId(null);
    setFormOpen(true);
    setName('');
    setSlug('');
    setType('suburb');
    setParentId('');
    setIsoCode('');
    setSlugTouched(false);
    setManualMode(false);
    setCandidates([]);
    setSelectedCandidateId(null);
    setFormError(null);
    setMessage(null);
  }

  function startEdit(item: Region): void {
    setEditingId(item.id);
    setFormOpen(true);
    setName(item.name);
    setSlug(item.slug);
    setType(
      (REGION_TYPES.includes(item.type as RegionType)
        ? item.type === 'city'
          ? 'municipality'
          : item.type
        : 'municipality') as RegionType,
    );
    setParentId(item.parentId ?? '');
    setIsoCode(item.isoCode ?? '');
    setSlugTouched(true);
    setManualMode(true);
    setCandidates([]);
    setSelectedCandidateId(null);
    setMessage(null);
    setFormError(null);
  }

  function onNameChange(value: string): void {
    setName(value);
    setFormError(null);
    if (!slugTouched && !editingId) {
      setSlug(
        value
          .trim()
          .toLowerCase()
          .replace(/ä/g, 'ae')
          .replace(/ö/g, 'oe')
          .replace(/ü/g, 'ue')
          .replace(/ß/g, 'ss')
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 80),
      );
    }
  }

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setFormError(null);
    try {
      if (!editingId && !manualMode && selectedCandidate) {
        const result = await adminFetch<{ createdCount: number; leaf: Region }>(
          '/api/v1/admin/regions/from-lookup',
          token,
          {
            method: 'POST',
            body: JSON.stringify({
              candidateId: selectedCandidate.id,
              label: selectedCandidate.label,
              chain: selectedCandidate.chain,
            }),
          },
        );
        setMessage(
          t('regions.chainCreated', {
            name: result.leaf.name,
            count: String(result.createdCount),
          }),
        );
        resetForm();
        await reload();
        return;
      }

      const body = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        type,
        parentId: parentId || null,
        isoCode: isoCode.trim() || null,
      };
      if (editingId) {
        await adminFetch(`/api/v1/admin/regions/${editingId}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setMessage(t('regions.updated'));
      } else {
        await adminFetch('/api/v1/admin/regions', token, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(t('regions.created'));
      }
      resetForm();
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Region): Promise<void> {
    if (!token) return;
    if (!window.confirm(t('regions.confirmDelete', { name: item.name }))) return;
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/regions/${item.id}`, token, { method: 'DELETE' });
      setMessage(t('regions.deleted'));
      if (editingId === item.id) {
        resetForm();
      }
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  const parentOptions = (data ?? []).filter((item) => item.id !== editingId);
  const hasFilters = filtersActive(filters);
  const createViaLookup = !editingId && !manualMode;

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('regions.title')}
        description={t('regions.description')}
        action={
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={startCreate}
          >
            {t('regions.add')}
          </button>
        }
      />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

      {formOpen ? (
        <Panel>
          <h2 className="mb-1 font-bold text-lg">
            {editingId ? t('regions.edit') : t('regions.add')}
          </h2>
          {!editingId ? (
            <p className="mb-3 text-sm text-[var(--muted)]">{t('regions.lookupHint')}</p>
          ) : null}
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
            <label className="text-sm md:col-span-2">
              {t('regions.fieldName')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={name}
                required
                onChange={(e) => onNameChange(e.target.value)}
                autoComplete="off"
              />
            </label>

            {createViaLookup ? (
              <div className="space-y-3 md:col-span-2">
                {lookupLoading ? (
                  <p className="text-sm text-[var(--muted)]">{t('regions.lookupLoading')}</p>
                ) : null}
                {!lookupLoading && name.trim().length >= 2 && candidates.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">{t('regions.lookupEmpty')}</p>
                ) : null}
                {candidates.length > 1 ? (
                  <fieldset className="space-y-2 rounded-md border border-[var(--border)] p-3">
                    <legend className="px-1 text-sm font-semibold">
                      {t('regions.lookupAmbiguous')}
                    </legend>
                    {candidates.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--background)]"
                      >
                        <input
                          type="radio"
                          className="mt-1"
                          name="region-candidate"
                          checked={selectedCandidateId === item.id}
                          onChange={() => setSelectedCandidateId(item.id)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                {selectedCandidate ? (
                  <div className="rounded-md border border-[var(--border)] bg-[var(--background)]/60 px-3 py-2 text-sm">
                    <p className="mb-1 font-semibold">{t('regions.lookupPreview')}</p>
                    <p className="text-[var(--muted)]">
                      {selectedCandidate.chain
                        .map((node) => `${t(regionTypeLabelKey(node.type))}: ${node.name}`)
                        .join(' › ')}
                    </p>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => {
                    setManualMode(true);
                    setCandidates([]);
                    setSelectedCandidateId(null);
                  }}
                >
                  {t('regions.switchManual')}
                </button>
              </div>
            ) : null}

            {!createViaLookup ? (
              <>
                <label className="text-sm">
                  {t('regions.fieldSlug')}
                  <input
                    className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-mono text-sm"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                  />
                </label>
                <label className="text-sm">
                  {t('regions.fieldType')}
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                    value={type}
                    onChange={(e) => setType(e.target.value as RegionType)}
                  >
                    {REGION_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {t(`regions.type.${value}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  {t('regions.fieldIso')}
                  <input
                    className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                    value={isoCode}
                    placeholder="DE"
                    onChange={(e) => setIsoCode(e.target.value)}
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  {t('regions.fieldParent')}
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  >
                    <option value="">{t('regions.noParent')}</option>
                    {parentOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({t(regionTypeLabelKey(item.type))})
                      </option>
                    ))}
                  </select>
                </label>
                {!editingId ? (
                  <button
                    type="button"
                    className="text-left text-sm font-semibold text-primary hover:underline md:col-span-2"
                    onClick={() => setManualMode(false)}
                  >
                    {t('regions.switchLookup')}
                  </button>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={saving || (createViaLookup && !selectedCandidate)}
                className="h-10 rounded-xl bg-primary px-4 text-white disabled:opacity-60"
              >
                {editingId
                  ? t('regions.saveChanges')
                  : createViaLookup
                    ? t('regions.createChain')
                    : t('regions.create')}
              </button>
              <button
                type="button"
                className="h-10 rounded-xl border border-[var(--border)] px-4"
                onClick={resetForm}
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <Panel className="overflow-x-auto !p-0">
        <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
          <thead className="bg-[var(--background)]">
            <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('name')}
                >
                  {t('regions.colName')}
                  {sortIndicator('name')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('slug')}
                >
                  {t('regions.colSlug')}
                  {sortIndicator('slug')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('type')}
                >
                  {t('regions.colType')}
                  {sortIndicator('type')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('parent')}
                >
                  {t('regions.colParent')}
                  {sortIndicator('parent')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('iso')}
                >
                  {t('regions.colIso')}
                  {sortIndicator('iso')}
                </button>
              </th>
              <th className="w-28 px-2 py-1.5 font-semibold">{t('regions.colActions')}</th>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.name}
                  placeholder={t('regions.filterNamePlaceholder')}
                  aria-label={t('regions.colName')}
                  onChange={(e) => patchFilter('name', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.slug}
                  placeholder={t('regions.filterSlugPlaceholder')}
                  aria-label={t('regions.colSlug')}
                  onChange={(e) => patchFilter('slug', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <select
                  className={inputClass}
                  value={filters.type}
                  aria-label={t('regions.colType')}
                  onChange={(e) => patchFilter('type', e.target.value as RegionFilters['type'])}
                >
                  <option value="">{t('regions.filterAnyType')}</option>
                  {REGION_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {t(`regions.type.${value}`)}
                    </option>
                  ))}
                </select>
              </th>
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.parent}
                  placeholder={t('regions.filterParentPlaceholder')}
                  aria-label={t('regions.colParent')}
                  onChange={(e) => patchFilter('parent', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.iso}
                  placeholder={t('regions.filterIsoPlaceholder')}
                  aria-label={t('regions.colIso')}
                  onChange={(e) => patchFilter('iso', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                {hasFilters ? (
                  <button
                    type="button"
                    className="h-7 text-xs text-[var(--muted)] underline-offset-2 hover:underline"
                    onClick={clearFilters}
                  >
                    {t('regions.clearFilters')}
                  </button>
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-[var(--border)]/60 hover:bg-[var(--background)]/80 ${
                  editingId === item.id ? 'bg-primary-soft/60' : ''
                }`}
              >
                <td className="px-2 py-1.5 font-medium">{item.name}</td>
                <td className="px-2 py-1.5 font-mono text-xs text-[var(--muted)]">{item.slug}</td>
                <td className="px-2 py-1.5">
                  <StatusPill value={t(regionTypeLabelKey(item.type))} />
                </td>
                <td className="px-2 py-1.5 text-xs">{parentLabel(item.parentId)}</td>
                <td className="px-2 py-1.5 font-mono text-xs">{item.isoCode ?? '—'}</td>
                <td className="px-2 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="rounded border border-[var(--border)] px-1.5 py-0.5 text-xs"
                      onClick={() => startEdit(item)}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-1.5 py-0.5 text-xs text-red-700"
                      onClick={() => void remove(item)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[var(--muted)]">
            {hasFilters ? t('regions.emptyFiltered') : t('regions.empty')}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
