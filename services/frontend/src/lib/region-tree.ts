import type { ApiRegion } from './api';
import { regionTypeGroupKey, regionTypeRank } from '@openeventhub/shared';

export type RegionOption = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  /** Display group key (city → municipality / Kommune). */
  readonly groupKey: string;
  readonly parentId: string | null;
  readonly depth: number;
  /** Ancestor names joined for search (e.g. "Hessen › Schwalm-Eder-Kreis"). */
  readonly pathLabel: string;
};

function compareRegions(a: ApiRegion, b: ApiRegion): number {
  const byType = regionTypeRank(a.type) - regionTypeRank(b.type);
  if (byType !== 0) return byType;
  return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
}

/**
 * Flatten regions into tree order: Land → Bundesland → Landkreis → Kommune → Ort.
 */
export function buildRegionOptions(regions: readonly ApiRegion[]): RegionOption[] {
  const byId = new Map(regions.map((r) => [r.id, r]));
  const children = new Map<string | null, ApiRegion[]>();

  for (const region of regions) {
    const parentKey = region.parentId && byId.has(region.parentId) ? region.parentId : null;
    const list = children.get(parentKey) ?? [];
    list.push(region);
    children.set(parentKey, list);
  }

  for (const list of children.values()) {
    list.sort(compareRegions);
  }

  const out: RegionOption[] = [];

  function walk(parentId: string | null, depth: number, ancestorNames: readonly string[]): void {
    for (const region of children.get(parentId) ?? []) {
      const pathLabel = ancestorNames.join(' › ');
      out.push({
        id: region.id,
        name: region.name,
        slug: region.slug,
        type: region.type,
        groupKey: regionTypeGroupKey(region.type),
        parentId: region.parentId,
        depth,
        pathLabel,
      });
      walk(region.id, depth + 1, [...ancestorNames, region.name]);
    }
  }

  walk(null, 0, []);
  return out;
}

export function findRegionOption(
  options: readonly RegionOption[],
  value: string,
  valueKey: 'id' | 'name' | 'slug' = 'id',
): RegionOption | undefined {
  if (!value) return undefined;
  return options.find((option) => option[valueKey] === value);
}

/** Case-insensitive match on name, slug, path, or type fragment. */
export function filterRegionOptions(
  options: readonly RegionOption[],
  query: string,
): RegionOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...options];
  return options.filter((option) => {
    const haystack =
      `${option.name} ${option.slug} ${option.pathLabel} ${option.type} ${option.groupKey}`.toLowerCase();
    return haystack.includes(needle);
  });
}
