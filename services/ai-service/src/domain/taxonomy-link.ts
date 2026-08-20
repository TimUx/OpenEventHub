import {
  looksLikeVenueOrAddressLabel,
  NominatimClient,
  normalizeCategoryKey,
  pickBestSettlementCandidate,
  resolveCategorySlugsForEvent,
  resolveDefaultCategorySlug,
  settlementQueryFromLabel,
  type ClassificationFields,
  type ExtractedEventFields,
  type NominatimSearchHit,
  type RegionHierarchyNode,
} from '@openeventhub/shared';
import type { Category, Region, RegionType, Tag, Venue } from '@prisma/client';

/** Minimal DB surface used by taxonomy linking (Prisma client or transaction). */
export type TaxonomyDb = {
  category: {
    findFirst(args: {
      where: { name?: { equals: string; mode: 'insensitive' }; slug?: string };
    }): Promise<Category | null>;
    findUnique(args: { where: { slug: string } }): Promise<Category | null>;
    create(args: {
      data: { name: string; slug: string; parentId: string | null };
    }): Promise<Category>;
  };
  region: {
    findFirst(args: {
      where: {
        name?: { equals: string; mode: 'insensitive' };
        slug?: string;
        type?: RegionType;
        parentId?: string | null;
      };
    }): Promise<Region | null>;
    findUnique(args: { where: { slug: string } }): Promise<Region | null>;
    create(args: {
      data: {
        name: string;
        slug: string;
        type: RegionType;
        parentId: string | null;
        isoCode?: string | null;
      };
    }): Promise<Region>;
  };
  tag: {
    findFirst(args: {
      where: { name?: { equals: string; mode: 'insensitive' } };
    }): Promise<Tag | null>;
    findUnique(args: { where: { slug: string } }): Promise<Tag | null>;
    create(args: { data: { name: string; slug: string } }): Promise<Tag>;
  };
  venue: {
    findFirst(args: {
      where: {
        OR?: Array<{ slug?: string; name?: { equals: string; mode: 'insensitive' } }>;
        slug?: string;
      };
    }): Promise<Venue | null>;
    findUnique(args: { where: { slug: string } }): Promise<Venue | null>;
    create(args: {
      data: {
        name: string;
        slug: string;
        address: string | null;
        city: string | null;
        regionId: string | null;
      };
    }): Promise<Venue>;
    update(args: {
      where: { id: string };
      data: {
        regionId?: string | null;
        address?: string | null;
        city?: string | null;
      };
    }): Promise<Venue>;
  };
  event: {
    update(args: { where: { id: string }; data: { venueId: string } }): Promise<unknown>;
  };
  eventCategory: {
    upsert(args: {
      where: { eventId_categoryId: { eventId: string; categoryId: string } };
      create: { eventId: string; categoryId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
  eventTag: {
    upsert(args: {
      where: { eventId_tagId: { eventId: string; tagId: string } };
      create: { eventId: string; tagId: string };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
};

export type TaxonomyLinkResult = {
  readonly categoryIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly regionId: string | null;
  readonly venueId: string | null;
};

/** Optional Nominatim wiring for tests / DI. */
export type TaxonomyLinkDeps = {
  readonly nominatim?: NominatimClient;
  readonly searchGermany?: (query: string) => Promise<NominatimSearchHit[]>;
};

const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastNominatimAt = 0;

async function paceNominatim(): Promise<void> {
  const now = Date.now();
  const wait = lastNominatimAt + NOMINATIM_MIN_INTERVAL_MS - now;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastNominatimAt = Date.now();
}

/** Reset Nominatim pacing (unit tests only). */
export function resetNominatimPaceForTests(): void {
  lastNominatimAt = 0;
}

/**
 * Resolve classification/extraction into catalog rows and link the event.
 * Regions: catalog match or Nominatim-verified settlement chain only — never blind LLM create.
 */
export async function linkEventTaxonomy(
  db: TaxonomyDb,
  args: {
    readonly eventId: string;
    readonly extraction: ExtractedEventFields;
    readonly classification: ClassificationFields;
  },
  deps: TaxonomyLinkDeps = {},
): Promise<TaxonomyLinkResult> {
  const categoryIds = await resolveCategories(db, args.classification, args.extraction);
  const tagIds = await resolveTags(db, args.classification.tags);
  const regionId = await resolvePlaceRegion(db, args.classification, deps);
  const venueId = await resolveVenue(db, args.extraction, args.classification, regionId);

  for (const categoryId of categoryIds) {
    await db.eventCategory.upsert({
      where: {
        eventId_categoryId: { eventId: args.eventId, categoryId },
      },
      create: { eventId: args.eventId, categoryId },
      update: {},
    });
  }

  for (const tagId of tagIds) {
    await db.eventTag.upsert({
      where: {
        eventId_tagId: { eventId: args.eventId, tagId },
      },
      create: { eventId: args.eventId, tagId },
      update: {},
    });
  }

  if (venueId) {
    await db.event.update({
      where: { id: args.eventId },
      data: { venueId },
    });
  }

  return { categoryIds, tagIds, regionId, venueId };
}

export type CategoryMatchRow = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

/**
 * Resolve classification labels onto existing catalog rows (no create).
 * When labels do not map unambiguously, infer from title/summary/description
 * aliases; otherwise fall back to curated `sonstiges` (never invents categories).
 */
export function matchCategoryIdsFromCatalog(
  labels: readonly string[],
  catalog: readonly CategoryMatchRow[],
  content?: {
    readonly title?: string | null;
    readonly summary?: string | null;
    readonly description?: string | null;
    readonly sourceCategories?: readonly string[];
  },
): string[] {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  const sourceIds = matchLabelsToCatalogIds(content?.sourceCategories ?? [], catalog);
  if (sourceIds.length > 0) {
    return sourceIds;
  }

  const ids: string[] = [];

  const slugs = resolveCategorySlugsForEvent({
    labels,
    ...(content?.title !== undefined ? { title: content.title } : {}),
    ...(content?.summary !== undefined ? { summary: content.summary } : {}),
    ...(content?.description !== undefined ? { description: content.description } : {}),
  });

  for (const slug of slugs) {
    const category = bySlug.get(slug) ?? null;
    if (category) {
      ids.push(category.id);
      continue;
    }
  }

  // Preserve legacy name-only catalog hits when curated slug resolution is empty
  // but operators added custom category names (still no create).
  if (ids.length === 0) {
    ids.push(...matchLabelsToCatalogIds(labels, catalog));
  }

  return [...new Set(ids)];
}

function matchLabelsToCatalogIds(
  labels: readonly string[],
  catalog: readonly CategoryMatchRow[],
): string[] {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  const byName = new Map(catalog.map((row) => [row.name.toLowerCase(), row]));
  const byNorm = new Map(catalog.map((row) => [normalizeCategoryKey(row.name), row]));
  const ids: string[] = [];

  for (const raw of labels) {
    const slug = resolveDefaultCategorySlug(raw);
    if (slug) {
      const category = bySlug.get(slug);
      if (category) {
        ids.push(category.id);
        continue;
      }
    }
    const name = raw.trim();
    if (!name) continue;
    const category =
      byName.get(name.toLowerCase()) ?? byNorm.get(normalizeCategoryKey(name)) ?? null;
    if (category) {
      ids.push(category.id);
    }
  }

  return [...new Set(ids)];
}

async function resolveCategories(
  db: TaxonomyDb,
  classification: ClassificationFields,
  extraction: ExtractedEventFields,
): Promise<string[]> {
  const sourceIds = await matchLabelsOnDb(db, extraction.sourceCategories ?? []);
  if (sourceIds.length > 0) {
    return sourceIds;
  }

  const labels = [...classification.categories, ...classification.subcategories];
  const slugs = resolveCategorySlugsForEvent({
    labels,
    title: extraction.title,
    summary: extraction.summary,
    description: extraction.description,
  });

  const ids: string[] = [];
  for (const slug of slugs) {
    const category = await db.category.findUnique({ where: { slug } });
    if (category) {
      ids.push(category.id);
      continue;
    }
  }

  if (ids.length === 0) {
    ids.push(...(await matchLabelsOnDb(db, labels)));
  }

  return [...new Set(ids)];
}

async function matchLabelsOnDb(db: TaxonomyDb, labels: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of labels) {
    const name = normalizeLabel(raw);
    if (!name) continue;
    const slug = resolveDefaultCategorySlug(name);
    if (slug) {
      const category = await db.category.findUnique({ where: { slug } });
      if (category) {
        ids.push(category.id);
        continue;
      }
    }
    const category = await db.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (category) {
      ids.push(category.id);
    }
  }
  return [...new Set(ids)];
}

async function resolveTags(db: TaxonomyDb, tags: readonly string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of tags) {
    const name = normalizeLabel(raw);
    if (!name) continue;
    const tag = await findOrCreateTag(db, name);
    ids.push(tag.id);
  }
  return [...new Set(ids)];
}

type PlaceQuery = {
  readonly label: string;
  readonly preferredTypes: readonly RegionType[];
};

function primaryPlaceQuery(classification: ClassificationFields): PlaceQuery | null {
  const candidates: Array<{ raw: string | null | undefined; preferredTypes: RegionType[] }> = [
    { raw: classification.place, preferredTypes: ['suburb', 'municipality'] },
    { raw: classification.municipality, preferredTypes: ['municipality', 'suburb'] },
    { raw: classification.district, preferredTypes: ['district'] },
    { raw: classification.region, preferredTypes: ['state'] },
  ];
  for (const candidate of candidates) {
    const label = normalizeLabel(candidate.raw);
    if (label) {
      return { label, preferredTypes: candidate.preferredTypes };
    }
  }
  return null;
}

/**
 * Resolve a settlement region: catalog match first, else Nominatim-verified hierarchy.
 * Never creates regions from unverified LLM venue/POI labels.
 */
async function resolvePlaceRegion(
  db: TaxonomyDb,
  classification: ClassificationFields,
  deps: TaxonomyLinkDeps,
): Promise<string | null> {
  const primary = primaryPlaceQuery(classification);
  if (!primary) {
    return null;
  }

  const settlementQuery = settlementQueryFromLabel(primary.label);
  const catalogNames = uniqueNonEmpty([
    // Prefer settlement fragment for venue-like labels (e.g. Stadtkirche Treysa → Treysa)
    looksLikeVenueOrAddressLabel(primary.label) ? settlementQuery : primary.label,
    settlementQuery,
    primary.label,
  ]);

  for (const name of catalogNames) {
    const existing = await findCatalogRegion(db, name, primary.preferredTypes);
    if (existing) {
      return existing.id;
    }
  }

  const nominatimQuery =
    settlementQuery ?? (looksLikeVenueOrAddressLabel(primary.label) ? null : primary.label);
  if (!nominatimQuery) {
    return null;
  }

  try {
    await paceNominatim();
    const hits = deps.searchGermany
      ? await deps.searchGermany(nominatimQuery)
      : await (deps.nominatim ?? new NominatimClient()).searchGermany(nominatimQuery);
    const candidate = pickBestSettlementCandidate(hits, primary.label);
    if (!candidate || candidate.chain.length === 0) {
      return null;
    }
    const leaf = await createRegionChain(db, candidate.chain);
    return leaf.id;
  } catch {
    // Timeout / rate limit / network: catalog-only, never blind-create from LLM labels
    return null;
  }
}

async function findCatalogRegion(
  db: TaxonomyDb,
  name: string,
  preferredTypes: readonly RegionType[],
): Promise<Region | null> {
  for (const type of preferredTypes) {
    const row = await db.region.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type },
    });
    if (row) {
      return row;
    }
  }
  return db.region.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
}

async function findByNameTypeParent(
  db: TaxonomyDb,
  name: string,
  type: RegionType,
  parentId: string | null,
): Promise<Region | null> {
  return db.region.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      type,
      parentId,
    },
  });
}

/** Find-or-create every node Land → … → leaf (same semantics as API RegionLookupService). */
async function createRegionChain(
  db: TaxonomyDb,
  chain: readonly RegionHierarchyNode[],
): Promise<Region> {
  if (chain.length === 0) {
    throw new Error('Empty hierarchy chain');
  }

  let parentId: string | null = null;
  let leaf: Region | null = null;

  for (const node of chain) {
    const type = node.type as RegionType;
    const existing = await findByNameTypeParent(db, node.name, type, parentId);
    if (existing) {
      leaf = existing;
      parentId = existing.id;
      continue;
    }

    const slug = await allocateUniqueSlug(db, 'region', node.name);
    leaf = await db.region.create({
      data: {
        name: node.name,
        slug,
        type,
        parentId,
        isoCode: node.isoCode,
      },
    });
    parentId = leaf.id;
  }

  return leaf!;
}

async function resolveVenue(
  db: TaxonomyDb,
  extraction: ExtractedEventFields,
  classification: ClassificationFields,
  regionId: string | null,
): Promise<string | null> {
  const name = normalizeLabel(extraction.venueName);
  if (!name) {
    return null;
  }

  const existing = await db.venue.findFirst({
    where: {
      OR: [{ slug: slugify(name) }, { name: { equals: name, mode: 'insensitive' } }],
    },
  });

  const city = normalizeLabel(classification.municipality);
  if (existing) {
    const nextAddress = extraction.venueAddress?.trim() || null;
    const shouldSetRegion = Boolean(regionId && !existing.regionId);
    const shouldSetAddress = Boolean(nextAddress && !existing.address);
    const shouldSetCity = Boolean(city && !existing.city);
    if (shouldSetRegion || shouldSetAddress || shouldSetCity) {
      const updated = await db.venue.update({
        where: { id: existing.id },
        data: {
          ...(shouldSetRegion && regionId ? { regionId } : {}),
          ...(shouldSetAddress ? { address: nextAddress } : {}),
          ...(shouldSetCity ? { city } : {}),
        },
      });
      return updated.id;
    }
    return existing.id;
  }

  const slug = await allocateUniqueSlug(db, 'venue', name);
  const created = await db.venue.create({
    data: {
      name,
      slug,
      address: extraction.venueAddress,
      city,
      regionId,
    },
  });
  return created.id;
}

async function findOrCreateTag(db: TaxonomyDb, name: string): Promise<Tag> {
  const existing = await db.tag.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) {
    return existing;
  }

  const slug = await allocateUniqueSlug(db, 'tag', name);
  return db.tag.create({
    data: { name, slug },
  });
}

async function allocateUniqueSlug(
  db: TaxonomyDb,
  kind: 'category' | 'region' | 'tag' | 'venue',
  name: string,
): Promise<string> {
  const base = slugify(name).slice(0, 80) || kind;
  let candidate = base;
  let n = 0;
  while (await slugExists(db, kind, candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

async function slugExists(
  db: TaxonomyDb,
  kind: 'category' | 'region' | 'tag' | 'venue',
  slug: string,
): Promise<boolean> {
  if (kind === 'category') {
    return Boolean(await db.category.findUnique({ where: { slug } }));
  }
  if (kind === 'region') {
    return Boolean(await db.region.findUnique({ where: { slug } }));
  }
  if (kind === 'tag') {
    return Boolean(await db.tag.findUnique({ where: { slug } }));
  }
  return Boolean(await db.venue.findUnique({ where: { slug } }));
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function normalizeLabel(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
