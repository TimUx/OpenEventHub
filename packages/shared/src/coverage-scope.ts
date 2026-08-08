/**
 * Geographic coverage scope (Abdeckungsgebiet).
 * Selecting a parent region (e.g. Landkreis) includes all descendants.
 */

export type CoverageRegionNode = {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
};

/** Normalize place/region names for coverage matching. */
export function normalizeCoverageKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** All region IDs covered by the selected roots (roots + descendants). */
export function expandCoverageRegionIds(
  rootIds: readonly string[],
  regions: readonly CoverageRegionNode[],
): ReadonlySet<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const region of regions) {
    if (!region.parentId) continue;
    const list = childrenByParent.get(region.parentId) ?? [];
    list.push(region.id);
    childrenByParent.set(region.parentId, list);
  }

  const allowed = new Set<string>();
  const stack = [...rootIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (allowed.has(id)) continue;
    allowed.add(id);
    for (const childId of childrenByParent.get(id) ?? []) {
      stack.push(childId);
    }
  }
  return allowed;
}

export function ancestorIds(
  regionId: string,
  regionsById: ReadonlyMap<string, CoverageRegionNode>,
): string[] {
  const chain: string[] = [];
  let current: string | null = regionId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = regionsById.get(current)?.parentId ?? null;
  }
  return chain;
}

export type CoverageDecision =
  | { readonly inScope: true; readonly reason: string }
  | { readonly inScope: false; readonly reason: string };

/**
 * Decide whether an extracted place belongs to the operator coverage set.
 * Empty roots ⇒ no filter (everything allowed).
 * Unknown place (no signals) ⇒ allowed (moderators can decide).
 * Known place outside roots/descendants ⇒ rejected.
 */
export function evaluateCoverageScope(args: {
  readonly scopeRootIds: readonly string[];
  readonly regions: readonly CoverageRegionNode[];
  readonly placeLabels: readonly (string | null | undefined)[];
  readonly resolvedRegionId?: string | null;
}): CoverageDecision {
  if (args.scopeRootIds.length === 0) {
    return { inScope: true, reason: 'coverage_disabled' };
  }

  const allowedIds = expandCoverageRegionIds(args.scopeRootIds, args.regions);
  const regionsById = new Map(args.regions.map((row) => [row.id, row]));
  const allowedKeys = new Set<string>();
  for (const region of args.regions) {
    if (!allowedIds.has(region.id)) continue;
    const key = normalizeCoverageKey(region.name);
    if (key) allowedKeys.add(key);
  }

  if (args.resolvedRegionId) {
    const chain = ancestorIds(args.resolvedRegionId, regionsById);
    if (chain.some((id) => allowedIds.has(id))) {
      return { inScope: true, reason: 'resolved_region_in_scope' };
    }
  }

  const labels = args.placeLabels
    .map((value) => (value ? normalizeCoverageKey(value) : ''))
    .filter((value) => value.length > 0);

  if (labels.length === 0 && !args.resolvedRegionId) {
    return { inScope: true, reason: 'place_unknown' };
  }

  for (const label of labels) {
    if (allowedKeys.has(label)) {
      return { inScope: true, reason: `label_match:${label}` };
    }
    // Soft containment: "Festplatz Treysa" vs scoped "Treysa"
    for (const key of allowedKeys) {
      if (key.length >= 4 && (label.includes(key) || key.includes(label))) {
        return { inScope: true, reason: `label_contains:${key}` };
      }
    }
  }

  // Resolved region known but outside scope
  if (args.resolvedRegionId) {
    return { inScope: false, reason: 'resolved_region_out_of_scope' };
  }

  // Place labels present but none matched coverage
  return { inScope: false, reason: `labels_out_of_scope:${labels.join('|')}` };
}
