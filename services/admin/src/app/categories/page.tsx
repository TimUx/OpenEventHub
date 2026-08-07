'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

type Category = { id: string; name: string; slug: string; parentId: string | null };

type CategoryFilters = {
  name: string;
  slug: string;
  parent: string;
};

type SortKey = 'name' | 'slug' | 'parent';
type SortDir = 'asc' | 'desc';

const EMPTY_FILTERS: CategoryFilters = { name: '', slug: '', parent: '' };

const inputClass =
  'h-7 w-full min-w-0 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 text-xs';

function filtersActive(filters: CategoryFilters): boolean {
  return Boolean(filters.name.trim() || filters.slug.trim() || filters.parent.trim());
}

export default function CategoriesPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Category[]>('/api/v1/admin/categories');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<CategoryFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const byId = useMemo(() => new Map((data ?? []).map((item) => [item.id, item])), [data]);

  function parentLabel(id: string | null): string {
    if (!id) return t('categories.noParent');
    return byId.get(id)?.name ?? id;
  }

  const rows = useMemo(() => {
    const nameQ = filters.name.trim().toLowerCase();
    const slugQ = filters.slug.trim().toLowerCase();
    const parentQ = filters.parent.trim().toLowerCase();
    const filtered = (data ?? []).filter((item) => {
      if (nameQ && !item.name.toLowerCase().includes(nameQ)) return false;
      if (slugQ && !item.slug.toLowerCase().includes(slugQ)) return false;
      if (parentQ) {
        const label = parentLabel(item.parentId).toLowerCase();
        if (!label.includes(parentQ)) return false;
      }
      return true;
    });
    const mul = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const left =
        sortKey === 'parent' ? parentLabel(a.parentId) : sortKey === 'slug' ? a.slug : a.name;
      const right =
        sortKey === 'parent' ? parentLabel(b.parentId) : sortKey === 'slug' ? b.slug : b.name;
      return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }) * mul;
    });
    return filtered;
  }, [data, filters, sortKey, sortDir, byId, t]);

  function patchFilter<K extends keyof CategoryFilters>(key: K, value: CategoryFilters[K]): void {
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
    setParentId('');
    setSlugTouched(false);
    setFormError(null);
  }

  function startCreate(): void {
    setEditingId(null);
    setFormOpen(true);
    setName('');
    setSlug('');
    setParentId('');
    setSlugTouched(false);
    setFormError(null);
    setMessage(null);
  }

  function startEdit(item: Category): void {
    setEditingId(item.id);
    setFormOpen(true);
    setName(item.name);
    setSlug(item.slug);
    setParentId(item.parentId ?? '');
    setSlugTouched(true);
    setMessage(null);
    setFormError(null);
  }

  function onNameChange(value: string): void {
    setName(value);
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
    const body = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      parentId: parentId || null,
    };
    try {
      if (editingId) {
        await adminFetch(`/api/v1/admin/categories/${editingId}`, token, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setMessage(t('categories.updated'));
      } else {
        await adminFetch('/api/v1/admin/categories', token, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setMessage(t('categories.created'));
      }
      resetForm();
      await reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Category): Promise<void> {
    if (!token) return;
    if (!window.confirm(t('categories.confirmDelete', { name: item.name }))) return;
    setFormError(null);
    try {
      await adminFetch(`/api/v1/admin/categories/${item.id}`, token, { method: 'DELETE' });
      setMessage(t('categories.deleted'));
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('categories.title')}
        description={t('categories.description')}
        action={
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={startCreate}
          >
            {t('categories.add')}
          </button>
        }
      />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

      {formOpen ? (
        <Panel>
          <h2 className="mb-3 font-bold text-lg">
            {editingId ? t('categories.edit') : t('categories.add')}
          </h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
            <label className="text-sm">
              {t('categories.fieldName')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={name}
                required
                onChange={(e) => onNameChange(e.target.value)}
              />
            </label>
            <label className="text-sm">
              {t('categories.fieldSlug')}
              <input
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3 font-mono text-sm"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </label>
            <label className="text-sm md:col-span-2">
              {t('categories.fieldParent')}
              <select
                className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">{t('categories.noParent')}</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="h-10 rounded-xl bg-primary px-4 text-white disabled:opacity-60"
              >
                {editingId ? t('categories.saveChanges') : t('categories.create')}
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
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-[var(--background)]">
            <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('name')}
                >
                  {t('categories.colName')}
                  {sortIndicator('name')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('slug')}
                >
                  {t('categories.colSlug')}
                  {sortIndicator('slug')}
                </button>
              </th>
              <th className="px-2 py-1.5">
                <button
                  type="button"
                  className="font-semibold hover:text-[var(--foreground)]"
                  onClick={() => toggleSort('parent')}
                >
                  {t('categories.colParent')}
                  {sortIndicator('parent')}
                </button>
              </th>
              <th className="w-28 px-2 py-1.5 font-semibold">{t('categories.colActions')}</th>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.name}
                  placeholder={t('categories.filterNamePlaceholder')}
                  aria-label={t('categories.colName')}
                  onChange={(e) => patchFilter('name', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.slug}
                  placeholder={t('categories.filterSlugPlaceholder')}
                  aria-label={t('categories.colSlug')}
                  onChange={(e) => patchFilter('slug', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                <input
                  type="search"
                  className={inputClass}
                  value={filters.parent}
                  placeholder={t('categories.filterParentPlaceholder')}
                  aria-label={t('categories.colParent')}
                  onChange={(e) => patchFilter('parent', e.target.value)}
                />
              </th>
              <th className="px-2 py-1">
                {hasFilters ? (
                  <button
                    type="button"
                    className="h-7 text-xs text-[var(--muted)] underline-offset-2 hover:underline"
                    onClick={clearFilters}
                  >
                    {t('categories.clearFilters')}
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
                <td className="px-2 py-1.5 text-xs">{parentLabel(item.parentId)}</td>
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
            {hasFilters ? t('categories.emptyFiltered') : t('categories.empty')}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
