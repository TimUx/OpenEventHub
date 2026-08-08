/**
 * Category import allowlist.
 * Selecting a parent category includes all descendants.
 */

export type AllowlistCategoryNode = {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
};

/** All category IDs covered by the selected roots (roots + descendants). */
export function expandAllowlistCategoryIds(
  rootIds: readonly string[],
  categories: readonly AllowlistCategoryNode[],
): ReadonlySet<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = childrenByParent.get(category.parentId) ?? [];
    list.push(category.id);
    childrenByParent.set(category.parentId, list);
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

function ancestorCategoryIds(
  categoryId: string,
  categoriesById: ReadonlyMap<string, AllowlistCategoryNode>,
): string[] {
  const chain: string[] = [];
  let current: string | null = categoryId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = categoriesById.get(current)?.parentId ?? null;
  }
  return chain;
}

export type CategoryAllowlistDecision =
  | { readonly allowed: true; readonly reason: string }
  | { readonly allowed: false; readonly reason: string };

/**
 * Decide whether resolved catalog categories pass the operator allowlist.
 * Empty roots ⇒ no filter (everything allowed).
 * No resolved categories ⇒ allowed (moderators can decide).
 * Known categories with no intersection ⇒ rejected.
 */
export function evaluateCategoryAllowlist(args: {
  readonly allowlistRootIds: readonly string[];
  readonly categories: readonly AllowlistCategoryNode[];
  readonly resolvedCategoryIds: readonly string[];
}): CategoryAllowlistDecision {
  if (args.allowlistRootIds.length === 0) {
    return { allowed: true, reason: 'allowlist_disabled' };
  }

  if (args.resolvedCategoryIds.length === 0) {
    return { allowed: true, reason: 'category_unknown' };
  }

  const allowedIds = expandAllowlistCategoryIds(args.allowlistRootIds, args.categories);
  const categoriesById = new Map(args.categories.map((row) => [row.id, row]));

  for (const categoryId of args.resolvedCategoryIds) {
    const chain = ancestorCategoryIds(categoryId, categoriesById);
    if (chain.some((id) => allowedIds.has(id))) {
      return { allowed: true, reason: 'resolved_category_in_allowlist' };
    }
  }

  return { allowed: false, reason: 'categories_out_of_allowlist' };
}
