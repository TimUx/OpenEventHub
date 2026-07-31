import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrismaClient } from '@prisma/client';
import { EventStatus } from '@prisma/client';

import { EventRepository } from './event.repository.js';

describe('EventRepository', () => {
  it('creates and finds events by id and slug', async () => {
    const sampleEvent = {
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'sample-event',
      title: 'Sample Event',
      summary: null,
      description: null,
      startAt: new Date('2026-08-01T18:00:00.000Z'),
      endAt: null,
      confidenceScore: { toNumber: () => 0.85 },
      status: EventStatus.draft,
      venueId: null,
      organizerId: null,
      createdAt: new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    };

    const calls: string[] = [];

    const prisma = {
      event: {
        create: (args: { data: { slug: string } }) => {
          calls.push(`create:${args.data.slug}`);
          return Promise.resolve(sampleEvent);
        },
        findUnique: (args: { where: { id?: string; slug?: string } }) => {
          if (args.where.id === sampleEvent.id) {
            calls.push(`findById:${args.where.id}`);
            return Promise.resolve(sampleEvent);
          }

          if (args.where.slug === sampleEvent.slug) {
            calls.push(`findBySlug:${args.where.slug}`);
            return Promise.resolve(sampleEvent);
          }

          return Promise.resolve(null);
        },
      },
    } as unknown as PrismaClient;

    const repository = new EventRepository(prisma);

    const created = await repository.create({
      slug: sampleEvent.slug,
      title: sampleEvent.title,
      startAt: sampleEvent.startAt,
      status: EventStatus.draft,
    });

    assert.equal(created.slug, sampleEvent.slug);

    const byId = await repository.findById(sampleEvent.id);
    assert.equal(byId?.title, sampleEvent.title);

    const bySlug = await repository.findBySlug(sampleEvent.slug);
    assert.equal(bySlug?.id, sampleEvent.id);

    assert.deepEqual(calls, [
      'create:sample-event',
      `findById:${sampleEvent.id}`,
      'findBySlug:sample-event',
    ]);
  });
});
