'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
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
};

type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

function regionTypeLabelKey(type: string): `regions.type.${RegionType}` {
  const normalized = type === 'city' ? 'municipality' : type;
  if ((REGION_TYPES as readonly string[]).includes(normalized)) {
    return `regions.type.${normalized as RegionType}`;
  }
  return 'regions.type.municipality';
}

export default function ImportSettingsPage() {
  const { t } = useI18n();
  const { token } = useAuth();
  const {
    data: regions,
    error: regionsError,
    loading: regionsLoading,
  } = useAdminQuery<Region[]>('/api/v1/admin/regions');
  const {
    data: categories,
    error: categoriesError,
    loading: categoriesLoading,
  } = useAdminQuery<Category[]>('/api/v1/admin/categories');
  const {
    data: coverage,
    error: coverageError,
    reload: reloadCoverage,
  } = useAdminQuery<{ regionIds: string[] }>('/api/v1/admin/coverage-scope');
  const {
    data: categoryAllowlist,
    error: categoryAllowlistError,
    reload: reloadCategoryAllowlist,
  } = useAdminQuery<{ categoryIds: string[] }>('/api/v1/admin/category-import-allowlist');

  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [coverageSaving, setCoverageSaving] = useState(false);
  const [coverageSelected, setCoverageSelected] = useState<Set<string>>(new Set());
  const [categoriesSaving, setCategoriesSaving] = useState(false);
  const [categoriesSelected, setCategoriesSelected] = useState<Set<string>>(new Set());

  const regionById = useMemo(
    () => new Map((regions ?? []).map((item) => [item.id, item])),
    [regions],
  );
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((item) => [item.id, item])),
    [categories],
  );

  useEffect(() => {
    setCoverageSelected(new Set(coverage?.regionIds ?? []));
  }, [coverage]);

  useEffect(() => {
    setCategoriesSelected(new Set(categoryAllowlist?.categoryIds ?? []));
  }, [categoryAllowlist]);

  function regionParentLabel(id: string | null): string {
    if (!id) return t('regions.noParent');
    return regionById.get(id)?.name ?? id;
  }

  function categoryParentLabel(id: string | null): string {
    if (!id) return t('categories.noParent');
    return categoryById.get(id)?.name ?? id;
  }

  const coverageOptions = useMemo(() => {
    const list = [...(regions ?? [])];
    const typeOrder = new Map(REGION_TYPES.map((value, index) => [value, index]));
    list.sort((a, b) => {
      const typeCmp =
        (typeOrder.get(a.type as RegionType) ?? 99) - (typeOrder.get(b.type as RegionType) ?? 99);
      if (typeCmp !== 0) return typeCmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return list;
  }, [regions]);

  const categoryOptions = useMemo(() => {
    const list = [...(categories ?? [])];
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return list;
  }, [categories]);

  function toggleCoverage(id: string): void {
    setCoverageSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(id: string): void {
    setCategoriesSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveCoverage(): Promise<void> {
    if (!token) return;
    setCoverageSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      await adminFetch('/api/v1/admin/coverage-scope', token, {
        method: 'PUT',
        body: JSON.stringify({ regionIds: [...coverageSelected] }),
      });
      setMessage(t('importSettings.coverageSaved'));
      await reloadCoverage();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setCoverageSaving(false);
    }
  }

  async function saveCategories(): Promise<void> {
    if (!token) return;
    setCategoriesSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      await adminFetch('/api/v1/admin/category-import-allowlist', token, {
        method: 'PUT',
        body: JSON.stringify({ categoryIds: [...categoriesSelected] }),
      });
      setMessage(t('importSettings.categoriesSaved'));
      await reloadCategoryAllowlist();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setCategoriesSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('importSettings.title')} description={t('importSettings.description')} />
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      {coverageError ? <p className="text-sm text-red-700">{coverageError}</p> : null}
      {categoryAllowlistError ? (
        <p className="text-sm text-red-700">{categoryAllowlistError}</p>
      ) : null}
      {regionsError ? <p className="text-sm text-red-700">{regionsError}</p> : null}
      {categoriesError ? <p className="text-sm text-red-700">{categoriesError}</p> : null}

      <Panel>
        <h2 className="mb-1 font-bold text-lg">{t('importSettings.coverageTitle')}</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          {t('importSettings.coverageDescription')}
        </p>
        <p className="mb-2 text-xs text-[var(--muted)]">
          {coverageSelected.size === 0
            ? t('importSettings.coverageEmpty')
            : t('importSettings.coverageSelected', { count: String(coverageSelected.size) })}
        </p>
        {regionsLoading ? (
          <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p>
        ) : (
          <div className="mb-3 max-h-72 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
            {coverageOptions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {t('importSettings.noRegions')}{' '}
                <Link href="/regions" className="font-semibold text-primary hover:underline">
                  {t('importSettings.manageRegions')}
                </Link>
              </p>
            ) : (
              coverageOptions.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--background)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border)]"
                    checked={coverageSelected.has(item.id)}
                    onChange={() => toggleCoverage(item.id)}
                  />
                  <span>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[var(--muted)]">
                      {' '}
                      · {t(regionTypeLabelKey(item.type))}
                      {item.parentId ? ` · ${regionParentLabel(item.parentId)}` : ''}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        )}
        <button
          type="button"
          className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={coverageSaving || !token}
          onClick={() => void saveCoverage()}
        >
          {t('importSettings.coverageSave')}
        </button>
      </Panel>

      <Panel>
        <h2 className="mb-1 font-bold text-lg">{t('importSettings.categoriesTitle')}</h2>
        <p className="mb-3 text-sm text-[var(--muted)]">
          {t('importSettings.categoriesDescription')}
        </p>
        <p className="mb-2 text-xs text-[var(--muted)]">
          {categoriesSelected.size === 0
            ? t('importSettings.categoriesEmpty')
            : t('importSettings.categoriesSelected', { count: String(categoriesSelected.size) })}
        </p>
        {categoriesLoading ? (
          <p className="text-sm text-[var(--muted)]">{t('common.loading')}</p>
        ) : (
          <div className="mb-3 max-h-72 space-y-1 overflow-y-auto rounded-md border border-[var(--border)] p-2">
            {categoryOptions.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {t('importSettings.noCategories')}{' '}
                <Link href="/categories" className="font-semibold text-primary hover:underline">
                  {t('importSettings.manageCategories')}
                </Link>
              </p>
            ) : (
              categoryOptions.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--background)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border)]"
                    checked={categoriesSelected.has(item.id)}
                    onChange={() => toggleCategory(item.id)}
                  />
                  <span>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[var(--muted)]">
                      {' '}
                      · <span className="font-mono text-xs">{item.slug}</span>
                      {item.parentId ? ` · ${categoryParentLabel(item.parentId)}` : ''}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="h-9 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={categoriesSaving || !token}
            onClick={() => void saveCategories()}
          >
            {t('importSettings.categoriesSave')}
          </button>
          <Link href="/categories" className="text-sm font-semibold text-primary hover:underline">
            {t('importSettings.manageCategories')}
          </Link>
        </div>
      </Panel>
    </div>
  );
}
