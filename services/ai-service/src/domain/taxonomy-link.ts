import {
  resolveCategorySlugsForEvent,
  resolveDefaultCategorySlug,
  type ClassificationFields,
  type ExtractedEventFields,
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
      };
    }): Promise<Region | null>;
    findUnique(args: { where: { slug: string } }): Promise<Region | null>;
    create(args: {
      data: {
        name: string;
        slug: string;
        type: RegionType;
        parentId: string | null;
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

/**
 * Resolve classification/extraction into catalog rows (find-or-create) and link the event.
 * Places are created on demand — no full gazetteer required.
 */
export async function linkEventTaxonomy(
  db: TaxonomyDb,
  args: {
    readonly eventId: string;
    readonly extraction: ExtractedEventFields;
    readonly classification: ClassificationFields;
  },
): Promise<TaxonomyLinkResult> {
  const categoryIds = await resolveCategories(db, args.classification, args.extraction);
  const tagIds = await resolveTags(db, args.classification.tags);
  const regionId = await resolvePlaceRegion(db, args.classification);
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
  },
): string[] {
  const bySlug = new Map(catalog.map((row) => [row.slug, row]));
  const byName = new Map(catalog.map((row) => [row.name.toLowerCase(), row]));
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
    for (const raw of labels) {
      const name = normalizeLabel(raw);
      if (!name) continue;
      const curatedSlug = resolveDefaultCategorySlug(name);
      if (curatedSlug) continue;
      const category = byName.get(name.toLowerCase()) ?? null;
      if (category) {
        ids.push(category.id);
      }
    }
  }

  return [...new Set(ids)];
}

async function resolveCategories(
  db: TaxonomyDb,
  classification: ClassificationFields,
  extraction: ExtractedEventFields,
): Promise<string[]> {
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
    for (const raw of labels) {
      const name = normalizeLabel(raw);
      if (!name) continue;
      if (resolveDefaultCategorySlug(name)) continue;
      const category = await db.category.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (category) {
        ids.push(category.id);
      }
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

async function resolvePlaceRegion(
  db: TaxonomyDb,
  classification: ClassificationFields,
): Promise<string | null> {
  let parentId: string | null = null;
  let leafId: string | null = null;

  // Bundesland / state (optionally under Land if a country root exists)
  const regionName = normalizeLabel(classification.region);
  if (regionName) {
    const country = await db.region.findFirst({
      where: { type: 'country', name: { equals: 'Deutschland', mode: 'insensitive' } },
    });
    const region = await findOrCreateRegion(db, regionName, 'state', country?.id ?? null);
    parentId = region.id;
    leafId = region.id;
  }

  // Landkreis / district under state
  const districtName = normalizeLabel(classification.district);
  if (districtName) {
    const district = await findOrCreateRegion(db, districtName, 'district', parentId);
    parentId = district.id;
    leafId = district.id;
  }

  // Kommune (Gemeinde/Stadt) under Landkreis
  const municipalityName = normalizeLabel(classification.municipality);
  if (municipalityName) {
    const municipality = await findOrCreateRegion(db, municipalityName, 'municipality', parentId);
    parentId = municipality.id;
    leafId = municipality.id;
  }

  // Ort / Dorf / Ortsteil under Kommune (or under Landkreis if Kommune unknown)
  const placeName = normalizeLabel(classification.place);
  if (placeName) {
    const place = await findOrCreateRegion(db, placeName, 'suburb', parentId);
    leafId = place.id;
  }

  return leafId;
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
    if (regionId && !existing.regionId) {
      const updated = await db.venue.update({
        where: { id: existing.id },
        data: {
          regionId,
          ...(extraction.venueAddress ? { address: extraction.venueAddress } : {}),
          ...(city ? { city } : {}),
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

async function findOrCreateRegion(
  db: TaxonomyDb,
  name: string,
  type: RegionType,
  parentId: string | null,
): Promise<Region> {
  const existing = await db.region.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) {
    return existing;
  }

  const slug = await allocateUniqueSlug(db, 'region', name);
  return db.region.create({
    data: { name, slug, type, parentId },
  });
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
