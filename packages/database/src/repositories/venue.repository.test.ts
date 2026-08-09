import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrismaClient, Venue } from '@prisma/client';

import { VenueRepository } from './venue.repository.js';

describe('VenueRepository', () => {
  it('findOrCreate returns existing venue by name', async () => {
    const existing: Venue = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Stadthalle',
      slug: 'stadthalle',
      address: null,
      city: 'Schwalmstadt',
      regionId: null,
      latitude: null,
      longitude: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = {
      venue: {
        findFirst: () => Promise.resolve(existing),
        findUnique: () => Promise.resolve(null),
        create: () => Promise.reject(new Error('should not create')),
        update: () => Promise.reject(new Error('should not update')),
      },
    } as unknown as PrismaClient;

    const repo = new VenueRepository(prisma);
    const venue = await repo.findOrCreate({ name: 'stadthalle' });
    assert.equal(venue.id, existing.id);
  });

  it('findOrCreate creates when missing', async () => {
    const created: Venue = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Marktplatz',
      slug: 'marktplatz',
      address: 'Am Markt 1',
      city: 'Treysa',
      regionId: null,
      latitude: null,
      longitude: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = {
      venue: {
        findFirst: () => Promise.resolve(null),
        findUnique: () => Promise.resolve(null),
        create: (args: { data: { name: string; slug: string } }) => {
          assert.equal(args.data.name, 'Marktplatz');
          assert.equal(args.data.slug, 'marktplatz');
          return Promise.resolve(created);
        },
      },
    } as unknown as PrismaClient;

    const repo = new VenueRepository(prisma);
    const venue = await repo.findOrCreate({
      name: 'Marktplatz',
      city: 'Treysa',
      address: 'Am Markt 1',
    });
    assert.equal(venue.slug, 'marktplatz');
  });
});
