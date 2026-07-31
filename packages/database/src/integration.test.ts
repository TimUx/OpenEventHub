import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventStatus, SourceStatus } from '@prisma/client';

import {
  createPrismaClient,
  disconnectPrismaClient,
  EventRepository,
  SourceRepository,
} from './index.js';

const databaseUrl = process.env.DATABASE_URL;

describe('database integration', { skip: databaseUrl ? false : 'DATABASE_URL is not set' }, () => {
  it('persists and reads events and sources', async () => {
    const prisma = createPrismaClient({ datasourceUrl: databaseUrl });
    const eventRepository = new EventRepository(prisma);
    const sourceRepository = new SourceRepository(prisma);

    const suffix = crypto.randomUUID().slice(0, 8);
    const slug = `integration-event-${suffix}`;

    const createdEvent = await eventRepository.create({
      slug,
      title: 'Integration Test Event',
      startAt: new Date('2026-09-01T19:00:00.000Z'),
      status: EventStatus.draft,
    });

    const foundBySlug = await eventRepository.findBySlug(slug);
    assert.equal(foundBySlug?.id, createdEvent.id);

    const createdSource = await sourceRepository.create({
      name: `Integration Source ${suffix}`,
      pluginType: 'html',
      url: `https://example.com/${suffix}`,
      scheduleCron: '0 8 * * *',
      status: SourceStatus.healthy,
    });

    const listedSources = await sourceRepository.list();
    assert.ok(listedSources.some((source) => source.id === createdSource.id));

    await prisma.event.delete({ where: { id: createdEvent.id } });
    await prisma.source.delete({ where: { id: createdSource.id } });
    await disconnectPrismaClient();
  });
});
