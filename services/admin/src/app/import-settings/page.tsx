'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../components/auth-provider';
import { PageHeader, Panel, useAdminQuery } from '../../components/ui';
import { useI18n } from '../../i18n/i18n-provider';
import { adminFetch } from '../../lib/api';
import {
  buildRegionForest,
  collectExpandableIds,
  collectSubtreeIds,
  defaultExpandedIds,
  flattenVisible,
  type RegionTreeInput,
} from '../../lib/region-tree';

const REGION_TYPES = ['country', 'state', 'district', 'municipality', 'suburb', 'city'] as const;
type RegionType = (typeof REGION_TYPES)[number];

type Region = RegionTreeInput;

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [expandedInitialized, setExpandedInitialized] = useState(false);

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((item) => [item.id, item])),
    [categories],
  );

  const forest = useMemo(() => buildRegionForest(regions ?? []), [regions]);
  const expandableIds = useMemo(() => collectExpandableIds(forest), [forest]);
  const coverageRows = useMemo(
    () => flattenVisible(forest, expandedIds),
    [forest, expandedIds],
  );
  const descendantsById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const region of regions ?? []) {
      map.set(region.id, collectSubtreeIds(forest, region.id));
    }
    return map;
  }, [regions, forest]);

  useEffect(() => {
    if (!regions || expandedInitialized) return;
    setExpandedIds(defaultExpandedIds(regions));
    setExpandedInitialized(true);
  }, [regions, expandedInitialized]);

  useEffect(() => {
    const roots = coverage?.regionIds ?? [];
    if (!regions || regions.length === 0) {
      setCoverageSelected(new Set(roots));
      return;
    }
    // Expand stored roots so parent selection shows all child checkboxes as checked.
    const expanded = new Set<string>();
    for (const rootId of roots) {
      for (const id of collectSubtreeIds(forest, rootId)) {
        expanded.add(id);
      }
    }
    setCoverageSelected(expanded);
  }, [coverage, regions, forest]);

  useEffect(() => {
    setCategoriesSelected(new Set(categoryAllowlist?.categoryIds ?? []));
  }, [categoryAllowlist]);

  function categoryParentLabel(id: string | null): string {
    if (!id) return t('categories.noParent');
    return categoryById.get(id)?.name ?? id;
  }

  const categoryOptions = useMemo(() => {
    const list = [...(categories ?? [])];
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return list;
  }, [categories]);

  function toggleExpand(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll(): void {
    setExpandedIds(new Set(expandableIds));
  }

  function collapseAll(): void {
    setExpandedIds(new Set());
  }

  function subtreeSelected(id: string): boolean {
    const subtree = descendantsById.get(id) ?? [id];
    return subtree.every((childId) => coverageSelected.has(childId));
  }

  function subtreePartial(id: string): boolean {
    const subtree = descendantsById.get(id) ?? [id];
    if (subtree.length <= 1) return false;
    const selectedCount = subtree.filter((childId) => coverageSelected.has(childId)).length;
    return selectedCount > 0 && selectedCount < subtree.length;
  }

  function toggleCoverage(id: string): void {
    const subtree = descendantsById.get(id) ?? [id];
    setCoverageSelected((prev) => {
      const next = new Set(prev);
      const selecting = !subtree.every((childId) => next.has(childId));
      if (selecting) {
        for (const childId of subtree) next.add(childId);
      } else {
        for (const childId of subtree) next.delete(childId);
      }
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
        ) : (regions ?? []).length === 0 ? (
          <p className="mb-3 text-sm text-[var(--muted)]">
            {t('importSettings.noRegions')}{' '}
            <Link href="/regions" className="font-semibold text-primary hover:underline">
              {t('importSettings.manageRegions')}
            </Link>
          </p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="h-7 rounded border border-[var(--border)] px-2 disabled:opacity-60"
                disabled={expandableIds.length === 0}
                onClick={expandAll}
              >
                {t('regions.expandAll')}
              </button>
              <button
                type="button"
                className="h-7 rounded border border-[var(--border)] px-2 disabled:opacity-60"
                disabled={expandedIds.size === 0}
                onClick={collapseAll}
              >
                {t('regions.collapseAll')}
              </button>
              <Link href="/regions" className="font-semibold text-primary hover:underline">
                {t('importSettings.manageRegions')}
              </Link>
            </div>
            <div className="mb-3 max-h-96 space-y-0.5 overflow-y-auto rounded-md border border-[var(--border)] p-2">
              {coverageRows.map((row) => {
                const item = row.region;
                const isExpanded = expandedIds.has(item.id);
                const checked = subtreeSelected(item.id);
                const partial = !checked && subtreePartial(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 rounded px-1 py-1 text-sm hover:bg-[var(--background)]"
                    style={{ paddingLeft: `${0.25 + row.depth * 1.25}rem` }}
                  >
                    {row.hasChildren ? (
                      <button
                        type="button"
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded ? t('regions.collapseNode') : t('regions.expandNode')
                        }
                        onClick={() => toggleExpand(item.id)}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    ) : (
                      <span className="mt-0.5 inline-block w-5 shrink-0" aria-hidden />
                    )}
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border)]"
                        checked={checked}
                        ref={(el) => {
                          if (el) el.indeterminate = partial;
                        }}
                        onChange={() => toggleCoverage(item.id)}
                        aria-label={item.name}
                      />
                      <span className="min-w-0">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-[var(--muted)]">
                          {' '}
                          · {t(regionTypeLabelKey(item.type))}
                        </span>
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          </>
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
