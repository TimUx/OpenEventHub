/**
 * Client-side region hierarchy helpers for Admin Regions tree view.
 */

export type RegionTreeInput = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  readonly parentId: string | null;
  readonly isoCode: string | null;
};

export type RegionTreeNode<T extends RegionTreeInput = RegionTreeInput> = {
  readonly region: T;
  readonly children: RegionTreeNode<T>[];
};

export type FlatTreeRow<T extends RegionTreeInput = RegionTreeInput> = {
  readonly region: T;
  readonly depth: number;
  readonly hasChildren: boolean;
  /** Ancestor names from root to parent (excluding self). */
  readonly pathNames: readonly string[];
  readonly matched: boolean;
};

export type RegionTreeFilter = {
  readonly name?: string;
  readonly slug?: string;
  readonly type?: string;
  readonly path?: string;
  readonly iso?: string;
};

function sortByName<T extends RegionTreeInput>(a: T, b: T): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Build a forest from flat regions. Roots are `parentId === null`.
 * Orphans (missing parent) become additional roots.
 */
export function buildRegionForest<T extends RegionTreeInput>(
  regions: readonly T[],
): RegionTreeNode<T>[] {
  const byId = new Map(regions.map((row) => [row.id, row]));
  const children = new Map<string | null, T[]>();

  for (const row of regions) {
    const parentKey = row.parentId && byId.has(row.parentId) ? row.parentId : null;
    const list = children.get(parentKey) ?? [];
    list.push(row);
    children.set(parentKey, list);
  }

  function build(parentId: string | null): RegionTreeNode<T>[] {
    const rows = [...(children.get(parentId) ?? [])].sort(sortByName);
    return rows.map((region) => ({
      region,
      children: build(region.id),
    }));
  }

  return build(null);
}

/** Default expanded: country / state / district (not municipality or suburb). */
export function defaultExpandedIds(regions: readonly RegionTreeInput[]): Set<string> {
  const expanded = new Set<string>();
  for (const row of regions) {
    if (row.type === 'country' || row.type === 'state' || row.type === 'district') {
      expanded.add(row.id);
    }
  }
  return expanded;
}

export function collectExpandableIds<T extends RegionTreeInput>(
  forest: readonly RegionTreeNode<T>[],
): string[] {
  const ids: string[] = [];
  function walk(nodes: readonly RegionTreeNode<T>[]): void {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.push(node.region.id);
        walk(node.children);
      }
    }
  }
  walk(forest);
  return ids;
}

export function isFilterActive(filter: RegionTreeFilter): boolean {
  return Boolean(
    filter.name?.trim() ||
    filter.slug?.trim() ||
    filter.type?.trim() ||
    filter.path?.trim() ||
    filter.iso?.trim(),
  );
}

function matchesFilter<T extends RegionTreeInput>(
  region: T,
  pathNames: readonly string[],
  filter: RegionTreeFilter,
): boolean {
  const nameQ = filter.name?.trim().toLowerCase() ?? '';
  const slugQ = filter.slug?.trim().toLowerCase() ?? '';
  const typeQ = filter.type?.trim() ?? '';
  const pathQ = filter.path?.trim().toLowerCase() ?? '';
  const isoQ = filter.iso?.trim().toLowerCase() ?? '';

  if (nameQ && !region.name.toLowerCase().includes(nameQ)) return false;
  if (slugQ && !region.slug.toLowerCase().includes(slugQ)) return false;
  if (typeQ && region.type !== typeQ) return false;
  if (isoQ && !(region.isoCode ?? '').toLowerCase().includes(isoQ)) return false;
  if (pathQ) {
    const pathText = [...pathNames, region.name].join(' ').toLowerCase();
    const parentOnly = pathNames.join(' ').toLowerCase();
    if (!pathText.includes(pathQ) && !parentOnly.includes(pathQ)) return false;
  }
  return true;
}

type MarkedNode<T extends RegionTreeInput> = {
  readonly node: RegionTreeNode<T>;
  readonly selfMatch: boolean;
  readonly keep: boolean;
  readonly children: MarkedNode<T>[];
};

function markForest<T extends RegionTreeInput>(
  forest: readonly RegionTreeNode<T>[],
  filter: RegionTreeFilter,
  filtering: boolean,
  pathNames: readonly string[] = [],
): MarkedNode<T>[] {
  return forest.map((node) => {
    const selfMatch = filtering ? matchesFilter(node.region, pathNames, filter) : true;
    const children = markForest(node.children, filter, filtering, [...pathNames, node.region.name]);
    const childKeep = children.some((child) => child.keep);
    const keep = filtering ? selfMatch || childKeep : true;
    return { node, selfMatch, keep, children };
  });
}

/**
 * Flatten forest for rendering. When a filter is active, keep matches plus ancestors;
 * ancestors with matching descendants are auto-expanded.
 */
export function flattenVisible<T extends RegionTreeInput>(
  forest: readonly RegionTreeNode<T>[],
  expandedIds: ReadonlySet<string>,
  filter: RegionTreeFilter = {},
): FlatTreeRow<T>[] {
  const filtering = isFilterActive(filter);
  const marked = markForest(forest, filter, filtering);
  const out: FlatTreeRow<T>[] = [];

  function emit(
    nodes: readonly MarkedNode<T>[],
    depth: number,
    pathNames: readonly string[],
  ): void {
    for (const mark of nodes) {
      if (!mark.keep) continue;
      out.push({
        region: mark.node.region,
        depth,
        hasChildren: mark.node.children.length > 0,
        pathNames,
        matched: filtering ? mark.selfMatch : false,
      });
      const shouldExpand = filtering
        ? mark.children.some((child) => child.keep)
        : expandedIds.has(mark.node.region.id);
      if (shouldExpand) {
        emit(mark.children, depth + 1, [...pathNames, mark.node.region.name]);
      }
    }
  }

  emit(marked, 0, []);
  return out;
}

export function formatRegionPath(pathNames: readonly string[], separator = ' › '): string {
  return pathNames.join(separator);
}

/**
 * Collect a node and all descendants from a forest (for coverage/bulk selection).
 * Returns `[rootId]` when the id is not found.
 */
export function collectSubtreeIds<T extends RegionTreeInput>(
  forest: readonly RegionTreeNode<T>[],
  rootId: string,
): string[] {
  function find(nodes: readonly RegionTreeNode<T>[]): RegionTreeNode<T> | null {
    for (const node of nodes) {
      if (node.region.id === rootId) return node;
      const nested = find(node.children);
      if (nested) return nested;
    }
    return null;
  }

  const root = find(forest);
  if (!root) return [rootId];

  const ids: string[] = [];
  function walk(node: RegionTreeNode<T>): void {
    ids.push(node.region.id);
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(root);
  return ids;
}
