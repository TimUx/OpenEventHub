import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';

import type { Category, Region, Tag, Venue } from '@prisma/client';

import {
  linkEventTaxonomy,
  matchCategoryIdsFromCatalog,
  normalizeLabel,
  resetNominatimPaceForTests,
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
            if (Object.prototype.hasOwnProperty.call(where, 'parentId')) {
              if (row.parentId !== where.parentId) return false;
            }
            return Boolean(
              where.name || where.slug || where.type || Object.prototype.hasOwnProperty.call(where, 'parentId'),
            );
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
          isoCode: data.isoCode ?? null,
          latitude: null,
          longitude: null,
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

const SCHWALMSTADT_NOMINATIM_HIT = {
  osm_type: 'relation',
  osm_id: 100,
  name: 'Schwalmstadt',
  class: 'boundary',
  type: 'administrative',
  addresstype: 'town',
  display_name: 'Schwalmstadt, Schwalm-Eder-Kreis, Hessen, Deutschland',
  address: {
    town: 'Schwalmstadt',
    county: 'Schwalm-Eder-Kreis',
    state: 'Hessen',
    country: 'Deutschland',
    country_code: 'de',
  },
} as const;

const TREYSA_NOMINATIM_HIT = {
  osm_type: 'relation',
  osm_id: 101,
  name: 'Treysa',
  class: 'place',
  type: 'suburb',
  addresstype: 'suburb',
  display_name: 'Treysa, Schwalmstadt, Schwalm-Eder-Kreis, Hessen, Deutschland',
  address: {
    suburb: 'Treysa',
    town: 'Schwalmstadt',
    county: 'Schwalm-Eder-Kreis',
    state: 'Hessen',
    country: 'Deutschland',
    country_code: 'de',
  },
} as const;

const CHURCH_POI_HIT = {
  osm_type: 'node',
  osm_id: 102,
  name: 'Stadtkirche Treysa',
  class: 'amenity',
  type: 'place_of_worship',
  addresstype: 'amenity',
  display_name: 'Stadtkirche Treysa, Treysa, Schwalmstadt, Hessen, Deutschland',
} as const;

describe('taxonomy-link', () => {
  it('normalizes and slugifies labels', () => {
    assert.equal(normalizeLabel('  Ziegenhain  '), 'Ziegenhain');
    assert.equal(slugify('Schwalm-Bräu'), 'schwalm-braeu');
  });

  it('maps labels onto curated categories and creates Nominatim region chain', async () => {
    resetNominatimPaceForTests();
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

    const result = await linkEventTaxonomy(
      db,
      {
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
      },
      {
        searchGermany: async () => [SCHWALMSTADT_NOMINATIM_HIT],
      },
    );

    assert.equal(db.regions.length, 4);
    assert.deepEqual(
      db.regions.map((row) => `${row.type}:${row.name}`),
      [
        'country:Deutschland',
        'state:Hessen',
        'district:Schwalm-Eder-Kreis',
        'municipality:Schwalmstadt',
      ],
    );
    assert.equal(db.regions[3]?.parentId, db.regions[2]?.id);

    // Culture → theater alias; Kirmes → kirmes; no new category rows created
    assert.equal(db.categories.length, 2);
    assert.equal(db.eventCategories.length, 2);
    assert.equal(db.venues.length, 1);
    assert.equal(db.venues[0]?.regionId, db.regions[3]?.id);
    assert.equal(db.eventVenue.get(eventId), db.venues[0]?.id);
    assert.equal(db.eventTags.length, 1);
    assert.equal(result.regionId, db.regions[3]?.id);
  });

  it('matches existing catalog regions without Nominatim', async () => {
    const db = createMemoryDb();
    const municipalityId = randomUUID();
    db.regions.push({
      id: municipalityId,
      name: 'Schwalmstadt',
      slug: 'schwalmstadt',
      type: 'municipality',
      parentId: null,
      isoCode: null,
      latitude: null,
      longitude: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    let nominatimCalls = 0;
    const result = await linkEventTaxonomy(
      db,
      {
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
          region: 'Hessen',
          municipality: 'schwalmstadt',
          place: null,
          district: null,
          classificationConfidence: 0.5,
        },
      },
      {
        searchGermany: async () => {
          nominatimCalls += 1;
          return [SCHWALMSTADT_NOMINATIM_HIT];
        },
      },
    );

    assert.equal(nominatimCalls, 0);
    assert.equal(db.regions.length, 1);
    assert.equal(result.regionId, municipalityId);
  });

  it('does not create a region from POI-only Nominatim hits', async () => {
    resetNominatimPaceForTests();
    const db = createMemoryDb();
    const result = await linkEventTaxonomy(
      db,
      {
        eventId: randomUUID(),
        extraction: {
          isEvent: true,
          title: 'Konzert',
          summary: null,
          description: null,
          startAt: '2026-01-01T00:00:00.000Z',
          endAt: null,
          organizerName: null,
          venueName: 'Stadtkirche Treysa',
          venueAddress: null,
          isRecurring: false,
          extractionConfidence: 0.8,
        },
        classification: {
          categories: [],
          subcategories: [],
          tags: [],
          region: null,
          municipality: null,
          place: 'Stadtkirche Treysa',
          district: null,
          classificationConfidence: 0.6,
        },
      },
      {
        searchGermany: async () => [CHURCH_POI_HIT],
      },
    );

    assert.equal(db.regions.length, 0);
    assert.equal(result.regionId, null);
    assert.equal(db.venues.length, 1);
    assert.equal(db.venues[0]?.name, 'Stadtkirche Treysa');
  });

  it('creates Treysa suburb chain when Nominatim returns a settlement hit for a church label', async () => {
    resetNominatimPaceForTests();
    const db = createMemoryDb();
    const result = await linkEventTaxonomy(
      db,
      {
        eventId: randomUUID(),
        extraction: {
          isEvent: true,
          title: 'Konzert',
          summary: null,
          description: null,
          startAt: '2026-01-01T00:00:00.000Z',
          endAt: null,
          organizerName: null,
          venueName: 'Stadtkirche Treysa',
          venueAddress: null,
          isRecurring: false,
          extractionConfidence: 0.8,
        },
        classification: {
          categories: [],
          subcategories: [],
          tags: [],
          region: null,
          municipality: null,
          place: 'Stadtkirche Treysa',
          district: null,
          classificationConfidence: 0.6,
        },
      },
      {
        searchGermany: async (query) => {
          assert.equal(query, 'Treysa');
          return [CHURCH_POI_HIT, TREYSA_NOMINATIM_HIT];
        },
      },
    );

    assert.ok(result.regionId);
    const leaf = db.regions.find((row) => row.id === result.regionId);
    assert.equal(leaf?.name, 'Treysa');
    assert.equal(leaf?.type, 'suburb');
    assert.equal(db.venues[0]?.regionId, leaf?.id);
  });

  it('prefers EMS sourceCategories over LLM festival guesses', async () => {
    const db = createMemoryDb();
    const tanzkursId = randomUUID();
    const kirmesId = randomUUID();
    db.categories.push(
      {
        id: kirmesId,
        name: 'Kirmes',
        slug: 'kirmes',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: tanzkursId,
        name: 'Tanzkurs',
        slug: 'tanzkurs',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    db.regions.push({
      id: randomUUID(),
      name: 'Borken (Hessen)',
      slug: 'borken-hessen',
      type: 'municipality',
      parentId: null,
      isoCode: null,
      latitude: null,
      longitude: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const eventId = randomUUID();
    const result = await linkEventTaxonomy(db, {
      eventId,
      extraction: {
        isEvent: true,
        title: 'Euer gemeinsamer Takt',
        summary: null,
        description: 'Paartanzkurs',
        startAt: '2026-08-21T18:00:00.000Z',
        endAt: null,
        organizerName: null,
        venueName: 'Glashaus Borken (Hessen)',
        venueAddress: 'Bahnhofstraße 32, 34582 Borken (Hessen)',
        isRecurring: true,
        extractionConfidence: 0.95,
        sourceCategories: ['Tanzkurs'],
      },
      classification: {
        categories: ['Kirmes'],
        subcategories: [],
        tags: [],
        region: 'Hessen',
        municipality: 'Borken (Hessen)',
        place: null,
        district: null,
        classificationConfidence: 0.4,
      },
    });

    assert.deepEqual(result.categoryIds, [tanzkursId]);
    assert.equal(db.venues[0]?.name, 'Glashaus Borken (Hessen)');
    assert.equal(db.venues[0]?.address, 'Bahnhofstraße 32, 34582 Borken (Hessen)');
  });

  it('reuses existing region names case-insensitively from catalog', async () => {
    const db = createMemoryDb();
    const ziegenhainId = randomUUID();
    db.regions.push({
      id: ziegenhainId,
      name: 'Ziegenhain',
      slug: 'ziegenhain',
      type: 'suburb',
      parentId: null,
      isoCode: null,
      latitude: null,
      longitude: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await linkEventTaxonomy(db, {
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
        municipality: 'ziegenhain',
        place: null,
        district: null,
        classificationConfidence: 0.5,
      },
    });

    assert.equal(db.regions.length, 1);
    assert.equal(result.regionId, ziegenhainId);
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

  it('matchCategoryIdsFromCatalog prefers sourceCategories over LLM labels', () => {
    const catalog = [
      { id: '1', name: 'Kirmes', slug: 'kirmes' },
      { id: '4', name: 'Tanzkurs', slug: 'tanzkurs' },
    ];
    assert.deepEqual(
      matchCategoryIdsFromCatalog(['Kirmes'], catalog, {
        title: 'Euer gemeinsamer Takt',
        sourceCategories: ['Tanzkurs'],
      }),
      ['4'],
    );
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
