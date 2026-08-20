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

  it('updates an event and appends an EventVersion', async () => {
    const sampleEvent = {
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'sample-event',
      title: 'Updated Title',
      summary: 'New summary',
      description: null,
      startAt: new Date('2026-08-01T18:00:00.000Z'),
      endAt: null,
      confidenceScore: 0.85,
      status: EventStatus.published,
      venueId: null,
      organizerId: null,
      createdAt: new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T13:00:00.000Z'),
    };

    const calls: string[] = [];
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
      event: {
        update: (args: {
          where: { id: string };
          data: { title?: string; status?: EventStatus };
        }) => {
          calls.push(`update:${args.where.id}:${args.data.title}:${args.data.status}`);
          return Promise.resolve({ ...sampleEvent, ...args.data });
        },
        delete: (args: { where: { id: string } }) => {
          calls.push(`delete:${args.where.id}`);
          return Promise.resolve(sampleEvent);
        },
      },
      eventVersion: {
        findFirst: () => {
          calls.push('version:findFirst');
          return Promise.resolve({ versionNumber: 1 });
        },
        create: (args: { data: { versionNumber: number; changeReason: string | null } }) => {
          calls.push(`version:create:${args.data.versionNumber}:${args.data.changeReason}`);
          return Promise.resolve(args.data);
        },
      },
    } as unknown as PrismaClient;

    const repository = new EventRepository(prisma);
    const updated = await repository.updateWithVersion(sampleEvent.id, {
      title: 'Updated Title',
      status: EventStatus.published,
      changeReason: 'admin.status',
    });
    assert.equal(updated.status, EventStatus.published);

    const removed = await repository.delete(sampleEvent.id);
    assert.equal(removed.id, sampleEvent.id);

    assert.deepEqual(calls, [
      `update:${sampleEvent.id}:Updated Title:published`,
      'version:findFirst',
      'version:create:2:admin.status',
      `delete:${sampleEvent.id}`,
    ]);
  });

  it('updates status for many events and appends versions', async () => {
    const firstId = '11111111-1111-4111-8111-111111111111';
    const secondId = '22222222-2222-4222-8222-222222222222';
    const calls: string[] = [];
    const prisma = {
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
      event: {
        findMany: (args: { where: { id: { in: string[] } } }) => {
          calls.push(`findMany:${args.where.id.in.join(',')}`);
          return Promise.resolve([
            {
              id: firstId,
              title: 'One',
              startAt: new Date('2026-08-01T18:00:00.000Z'),
              endAt: null,
              allDay: false,
              venueId: null,
              organizerId: null,
              confidenceScore: 0.5,
            },
            {
              id: secondId,
              title: 'Two',
              startAt: new Date('2026-08-02T18:00:00.000Z'),
              endAt: null,
              allDay: false,
              venueId: null,
              organizerId: null,
              confidenceScore: 0.5,
            },
          ]);
        },
        updateMany: (args: { where: { id: { in: string[] } }; data: { status: EventStatus } }) => {
          calls.push(`updateMany:${args.where.id.in.length}:${args.data.status}`);
          return Promise.resolve({ count: args.where.id.in.length });
        },
      },
      eventVersion: {
        groupBy: () => {
          calls.push('version:groupBy');
          return Promise.resolve([{ eventId: firstId, _max: { versionNumber: 3 } }]);
        },
        createMany: (args: { data: Array<{ eventId: string; versionNumber: number }> }) => {
          calls.push(
            `version:createMany:${args.data.map((row) => `${row.eventId}:${row.versionNumber}`).join(',')}`,
          );
          return Promise.resolve({ count: args.data.length });
        },
      },
    } as unknown as PrismaClient;

    const repository = new EventRepository(prisma);
    const result = await repository.updateStatusMany(
      [firstId, secondId, firstId],
      EventStatus.published,
      'admin.bulk_status',
    );
    assert.equal(result.updated, 2);
    assert.deepEqual(result.ids, [firstId, secondId]);
    assert.deepEqual(calls, [
      `findMany:${firstId},${secondId}`,
      'updateMany:2:published',
      'version:groupBy',
      `version:createMany:${firstId}:4,${secondId}:1`,
    ]);
  });

  it('deletes many events by id', async () => {
    const firstId = '11111111-1111-4111-8111-111111111111';
    const calls: string[] = [];
    const prisma = {
      event: {
        findMany: () => {
          calls.push('findMany');
          return Promise.resolve([{ id: firstId }]);
        },
        deleteMany: (args: { where: { id: { in: string[] } } }) => {
          calls.push(`deleteMany:${args.where.id.in.join(',')}`);
          return Promise.resolve({ count: args.where.id.in.length });
        },
      },
    } as unknown as PrismaClient;

    const repository = new EventRepository(prisma);
    const result = await repository.deleteMany([firstId, 'missing']);
    assert.equal(result.deleted, 1);
    assert.deepEqual(result.ids, [firstId]);
    assert.deepEqual(calls, ['findMany', `deleteMany:${firstId}`]);
  });
});
