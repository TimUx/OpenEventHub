'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';

type Category = { id: string; name: string; slug: string; parentId: string | null };

export default function CategoriesPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const { data, error, loading, reload } = useAdminQuery<Category[]>('/api/v1/admin/categories');
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const byId = useMemo(() => new Map((data ?? []).map((item) => [item.id, item])), [data]);

  function parentLabel(id: string | null): string {
    if (!id) return t('categories.noParent');
    return byId.get(id)?.name ?? id;
  }

  function resetForm(): void {
    setEditingId(null);
    setName('');
    setSlug('');
    setParentId('');
    setSlugTouched(false);
    setFormError(null);
  }

  function startCreate(): void {
    resetForm();
  }

  function startEdit(item: Category): void {
    setEditingId(item.id);
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

  return (
    <div className="space-y-6">
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
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {item.slug} · {parentLabel(item.parentId)}
              </p>
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
