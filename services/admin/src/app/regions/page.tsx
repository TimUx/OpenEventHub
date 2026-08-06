'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, StatusPill, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

const REGION_TYPES = [
  'country',
  'state',
  'district',
  'municipality',
  'city',
  'suburb',
] as const;

type RegionType = (typeof REGION_TYPES)[number];

type Region = {
  id: string;
  name: string;
  slug: string;
  type: RegionType | string;
  parentId: string | null;
  isoCode: string | null;
};

export default function RegionsPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Region[]>('/api/v1/admin/regions');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<RegionType>('city');
  const [parentId, setParentId] = useState('');
  const [isoCode, setIsoCode] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const byId = useMemo(() => new Map((data ?? []).map((item) => [item.id, item])), [data]);

  function parentLabel(id: string | null): string {
    if (!id) return t('regions.noParent');
    return byId.get(id)?.name ?? id;
  }

  function resetForm(): void {
    setEditingId(null);
    setName('');
    setSlug('');
    setType('city');
    setParentId('');
    setIsoCode('');
    setSlugTouched(false);
    setFormError(null);
  }

  function startCreate(): void {
    resetForm();
  }

  function startEdit(item: Region): void {
    setEditingId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setType((REGION_TYPES.includes(item.type as RegionType) ? item.type : 'city') as RegionType);
    setParentId(item.parentId ?? '');
    setIsoCode(item.isoCode ?? '');
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
      type,
      parentId: parentId || null,
      isoCode: isoCode.trim() || null,
    };
    try {
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

  return (
    <div className="space-y-6">
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

      <Panel>
        <h2 className="mb-3 font-bold text-lg">
          {editingId ? t('regions.edit') : t('regions.add')}
        </h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => void onSubmit(e)}>
          <label className="text-sm">
            {t('regions.fieldName')}
            <input
              className="mt-1 h-10 w-full rounded-md border border-[var(--border)] px-3"
              value={name}
              required
              onChange={(e) => onNameChange(e.target.value)}
            />
          </label>
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
                  {item.name} ({item.type})
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
              {editingId ? t('regions.saveChanges') : t('regions.create')}
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

      <div className="grid gap-2 md:grid-cols-2">
        {(data ?? []).map((item) => (
          <Panel key={item.id} className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {item.slug} · {parentLabel(item.parentId)}
                  {item.isoCode ? ` · ${item.isoCode}` : ''}
                </p>
              </div>
              <StatusPill value={item.type} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
                onClick={() => startEdit(item)}
              >
                {t('common.edit')}
              </button>
              <button
                type="button"
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                onClick={() => void remove(item)}
              >
                {t('common.delete')}
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
