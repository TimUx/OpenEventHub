import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';

import type { Category, Region, Tag, Venue } from '@prisma/client';

import {
  linkEventTaxonomy,
  matchCategoryIdsFromCatalog,
  normalizeLabel,
  slugify,
  type TaxonomyDb,
} from './taxonomy-link.js';

function createMemoryDb(): TaxonomyDb & {
  categories: Category[];
  regions: Region[];
  tags: Tag[];
  venues: Venue[];
  eventCategories: Array<{ eventId: string; categoryId: string }>;
  eventTags: Array<{ eventId: string; tagId: string }>;
  eventVenue: Map<string, string>;
} {
  const categories: Category[] = [];
  const regions: Region[] = [];
  const tags: Tag[] = [];
  const venues: Venue[] = [];
  const eventCategories: Array<{ eventId: string; categoryId: string }> = [];
  const eventTags: Array<{ eventId: string; tagId: string }> = [];
  const eventVenue = new Map<string, string>();

  const nameEq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

  return {
    categories,
    regions,
    tags,
    venues,
    eventCategories,
    eventTags,
    eventVenue,
    category: {
      findFirst: async ({ where }) => {
        if (where.name) {
          return categories.find((row) => nameEq(row.name, where.name!.equals)) ?? null;
        }
        return null;
      },
      findUnique: async ({ where }) => categories.find((row) => row.slug === where.slug) ?? null,
      create: async ({ data }) => {
        const row = {
          id: randomUUID(),
          name: data.name,
          slug: data.slug,
          parentId: data.parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies Category;
        categories.push(row);
        return row;
      },
    },
    region: {
      findFirst: async ({ where }) => {
        return (
          regions.find((row) => {
            if (where.type && row.type !== where.type) return false;
            if (where.name && !nameEq(row.name, where.name.equals)) return false;
            if (where.slug && row.slug !== where.slug) return false;
            return Boolean(where.name || where.slug || where.type);
          }) ?? null
        );
      },
      findUnique: async ({ where }) => regions.find((row) => row.slug === where.slug) ?? null,
      create: async ({ data }) => {
        const row = {
          id: randomUUID(),
          name: data.name,
          slug: data.slug,
          type: data.type,
          parentId: data.parentId,
          isoCode: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies Region;
        regions.push(row);
        return row;
      },
    },
    tag: {
      findFirst: async ({ where }) => {
        if (where.name) {
          return tags.find((row) => nameEq(row.name, where.name!.equals)) ?? null;
        }
        return null;
      },
      findUnique: async ({ where }) => tags.find((row) => row.slug === where.slug) ?? null,
      create: async ({ data }) => {
        const row = {
          id: randomUUID(),
          name: data.name,
          slug: data.slug,
          createdAt: new Date(),
        } satisfies Tag;
        tags.push(row);
        return row;
      },
    },
    venue: {
      findFirst: async ({ where }) => {
        const or = where.OR ?? [];
        for (const clause of or) {
          if (clause.slug) {
            const hit = venues.find((row) => row.slug === clause.slug);
            if (hit) return hit;
          }
          if (clause.name) {
            const hit = venues.find((row) => nameEq(row.name, clause.name!.equals));
            if (hit) return hit;
          }
        }
        return null;
      },
      findUnique: async ({ where }) => venues.find((row) => row.slug === where.slug) ?? null,
      create: async ({ data }) => {
        const row = {
          id: randomUUID(),
          name: data.name,
          slug: data.slug,
          address: data.address,
          city: data.city,
          regionId: data.regionId,
          latitude: null,
          longitude: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies Venue;
        venues.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = venues.find((v) => v.id === where.id);
        assert.ok(row);
        if (data.regionId !== undefined) row.regionId = data.regionId;
        if (data.address !== undefined) row.address = data.address;
        if (data.city !== undefined) row.city = data.city;
        return row;
      },
    },
    event: {
      update: async ({ where, data }) => {
        eventVenue.set(where.id, data.venueId);
        return {};
      },
    },
    eventCategory: {
      upsert: async ({ create }) => {
        if (
          !eventCategories.some(
            (row) => row.eventId === create.eventId && row.categoryId === create.categoryId,
          )
        ) {
          eventCategories.push(create);
        }
        return {};
      },
    },
    eventTag: {
      upsert: async ({ create }) => {
        if (
          !eventTags.some((row) => row.eventId === create.eventId && row.tagId === create.tagId)
        ) {
          eventTags.push(create);
        }
        return {};
      },
    },
  };
}

describe('taxonomy-link', () => {
  it('normalizes and slugifies labels', () => {
    assert.equal(normalizeLabel('  Ziegenhain  '), 'Ziegenhain');
    assert.equal(slugify('Schwalm-Bräu'), 'schwalm-braeu');
  });

  it('maps labels onto curated categories without inventing new ones', async () => {
    const db = createMemoryDb();
    const eventId = randomUUID();
    db.categories.push(
      {
        id: randomUUID(),
        name: 'Kirmes',
        slug: 'kirmes',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
        name: 'Theater',
        slug: 'theater',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );

    const result = await linkEventTaxonomy(db, {
      eventId,
      extraction: {
        isEvent: true,
        title: 'Kirmes',
        summary: null,
        description: null,
        startAt: '2026-04-10T00:00:00.000Z',
        endAt: null,
        organizerName: null,
        venueName: 'Festplatz Florshain',
        venueAddress: null,
        isRecurring: false,
        extractionConfidence: 0.7,
      },
      classification: {
        categories: ['Culture'],
        subcategories: ['Kirmes'],
        tags: ['schwalm'],
        region: 'Hessen',
        municipality: 'Schwalmstadt',
        place: null,
        district: 'Schwalm-Eder-Kreis',
        classificationConfidence: 0.8,
      },
    });

    assert.equal(db.regions.length, 3);
    assert.equal(db.regions[0]?.name, 'Hessen');
    assert.equal(db.regions[0]?.type, 'state');
    assert.equal(db.regions[1]?.name, 'Schwalm-Eder-Kreis');
    assert.equal(db.regions[1]?.type, 'district');
    assert.equal(db.regions[1]?.parentId, db.regions[0]?.id);
    assert.equal(db.regions[2]?.name, 'Schwalmstadt');
    assert.equal(db.regions[2]?.type, 'municipality');
    assert.equal(db.regions[2]?.parentId, db.regions[1]?.id);

    // Culture → theater alias; Kirmes → kirmes; no new category rows created
    assert.equal(db.categories.length, 2);
    assert.equal(db.eventCategories.length, 2);
    assert.equal(db.venues.length, 1);
    assert.equal(db.venues[0]?.regionId, db.regions[2]?.id);
    assert.equal(db.eventVenue.get(eventId), db.venues[0]?.id);
    assert.equal(db.eventTags.length, 1);
    assert.equal(result.regionId, db.regions[2]?.id);
  });

  it('reuses existing region names case-insensitively', async () => {
    const db = createMemoryDb();
    db.regions.push({
      id: randomUUID(),
      name: 'Hessen',
      slug: 'hessen',
      type: 'state',
      parentId: null,
      isoCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await linkEventTaxonomy(db, {
      eventId: randomUUID(),
      extraction: {
        isEvent: true,
        title: 'X',
        summary: null,
        description: null,
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: null,
        organizerName: null,
        venueName: null,
        venueAddress: null,
        isRecurring: false,
        extractionConfidence: 0.5,
      },
      classification: {
        categories: [],
        subcategories: [],
        tags: [],
        region: 'hessen',
        municipality: 'Ziegenhain',
        place: null,
        district: null,
        classificationConfidence: 0.5,
      },
    });

    assert.equal(db.regions.length, 2);
    assert.equal(db.regions[1]?.parentId, db.regions[0]?.id);
  });

  it('matchCategoryIdsFromCatalog maps aliases without inventing rows', () => {
    const catalog = [
      { id: '1', name: 'Kirmes', slug: 'kirmes' },
      { id: '2', name: 'Konzert', slug: 'konzert' },
      { id: '3', name: 'Sonstiges', slug: 'sonstiges' },
    ];
    const ids = matchCategoryIdsFromCatalog(
      ['traditionskirmes', 'Concerts', 'unknown-xyz'],
      catalog,
    );
    assert.deepEqual(ids, ['1', '2']);
  });

  it('matchCategoryIdsFromCatalog infers from title or falls back to Sonstiges', () => {
    const catalog = [
      { id: '1', name: 'Kirmes', slug: 'kirmes' },
      { id: '3', name: 'Sonstiges', slug: 'sonstiges' },
    ];
    assert.deepEqual(
      matchCategoryIdsFromCatalog([], catalog, { title: 'Kirmes Niedergrenzebach' }),
      ['1'],
    );
    assert.deepEqual(matchCategoryIdsFromCatalog([], catalog, { title: 'Nachbarschaftstreffen' }), [
      '3',
    ]);
  });
});
