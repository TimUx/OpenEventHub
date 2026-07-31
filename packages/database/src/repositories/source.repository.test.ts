import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrismaClient } from '@prisma/client';
import { SourceStatus } from '@prisma/client';

import { SourceRepository } from './source.repository.js';

describe('SourceRepository', () => {
  it('creates, lists, and finds sources by id', async () => {
    const sampleSource = {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Fixture RSS Feed',
      pluginType: 'rss',
      url: 'https://example.com/events.rss',
      scheduleCron: '0 6 * * *',
      config: {},
      status: SourceStatus.healthy,
      lastCrawlAt: null,
      lastError: null,
      createdAt: new Date('2026-07-31T12:00:00.000Z'),
      updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    };

    const prisma = {
      source: {
        create: () => Promise.resolve(sampleSource),
        findUnique: (args: { where: { id: string } }) =>
          Promise.resolve(args.where.id === sampleSource.id ? sampleSource : null),
        findMany: () => Promise.resolve([sampleSource]),
      },
    } as unknown as PrismaClient;

    const repository = new SourceRepository(prisma);

    const created = await repository.create({
      name: sampleSource.name,
      pluginType: sampleSource.pluginType,
      url: sampleSource.url,
      scheduleCron: sampleSource.scheduleCron,
    });

    assert.equal(created.pluginType, 'rss');

    const listed = await repository.list();
    assert.equal(listed.length, 1);

    const found = await repository.findById(sampleSource.id);
    assert.equal(found?.name, sampleSource.name);
  });
});
