import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import type { PrismaClient } from '@prisma/client';
import { CrawlJobStatus, CrawlResultStatus, SourceRepository } from '@openeventhub/database';
import type { AiJobPayload, CrawlJobPayload, OcrJobPayload } from '@openeventhub/shared';

import { CrawlProcessingService } from './crawl/crawl-processing.service.js';
import type { DownstreamJobPublisher } from './crawl/downstream-job.publisher.js';
import { FsObjectStorageClient } from './object-storage/fs-object-storage.client.js';
import { ObjectStorageService } from './object-storage/object-storage.service.js';
import { PluginRegistryService } from './plugins/plugin-registry.service.js';

function createPrismaStub(args: {
  sourceId: string;
  crawlJobId: string;
  source: Record<string, unknown>;
  priorSuccess?: { objectKey: string; contentHash: string } | null;
}) {
  const sources = new Map<string, any>([[args.sourceId, args.source]]);
  let crawlJobRecord: any;
  let crawlResultRecord: any;
  const results: any[] = [];

  if (args.priorSuccess) {
    results.push({
      id: '00000000-0000-4000-8000-000000000001',
      objectKey: args.priorSuccess.objectKey,
      contentHash: args.priorSuccess.contentHash,
      status: CrawlResultStatus.success,
      crawlJob: { sourceId: args.sourceId },
      fetchedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }

  const prisma = {
    source: {
      findUnique: async ({ where: { id } }: any) => sources.get(id) ?? null,
      update: async ({ where: { id }, data }: any) => {
        const current = sources.get(id);
        assert.ok(current, `source '${id}' exists`);
        const next = { ...current, ...data, updatedAt: new Date() };
        sources.set(id, next);
        return next;
      },
    },
    crawlJob: {
      create: async ({ data }: any) => {
        crawlJobRecord = {
          id: args.crawlJobId,
          sourceId: data.source.connect.id,
          status: data.status,
          scheduledAt: data.scheduledAt,
          startedAt: data.startedAt,
          errorMessage: data.errorMessage,
        };
        return crawlJobRecord;
      },
      update: async ({ where: { id }, data }: any) => {
        assert.equal(id, args.crawlJobId);
        crawlJobRecord = { ...crawlJobRecord, ...data };
        return crawlJobRecord;
      },
    },
    crawlResult: {
      findFirst: async ({ where }: any) => {
        return (
          results.find(
            (row) =>
              row.contentHash === where.contentHash &&
              row.status === where.status &&
              row.crawlJob.sourceId === where.crawlJob.sourceId,
          ) ?? null
        );
      },
      create: async ({ data }: any) => {
        crawlResultRecord = {
          id: '33333333-3333-4333-8333-333333333333',
          crawlJobId: data.crawlJob.connect.id,
          objectKey: data.objectKey,
          contentHash: data.contentHash,
          status: data.status,
          mimeType: data.mimeType,
          byteSize: data.byteSize,
          fetchedAt: data.fetchedAt,
        };
        results.push({
          ...crawlResultRecord,
          crawlJob: { sourceId: args.sourceId },
        });
        return crawlResultRecord;
      },
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    getCrawlJob: () => crawlJobRecord,
    getCrawlResult: () => crawlResultRecord,
  };
}

describe('CrawlProcessingService (milestone 5)', () => {
  it('crawls a fixture RSS file, stores raw content, and enqueues AI', async () => {
    const fixturePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      'fixtures/fixture.rss',
    );
    const fixtureContent = await fs.readFile(fixturePath);
    const contentHash = crypto.createHash('sha256').update(fixtureContent).digest('hex');

    const sourceId = '11111111-1111-4111-8111-111111111111';
    const crawlJobId = '22222222-2222-4222-8222-222222222222';
    const objectKey = `crawl-results/${crawlJobId}/${contentHash}`;
    const sourceUrl = `file://${fixturePath}`;

    const stub = createPrismaStub({
      sourceId,
      crawlJobId,
      source: {
        id: sourceId,
        name: 'Fixture RSS',
        pluginType: 'rss',
        url: sourceUrl,
        scheduleCron: null,
        config: {},
        status: 'healthy',
        lastCrawlAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const aiJobs: AiJobPayload[] = [];
    const ocrJobs: OcrJobPayload[] = [];
    const downstream: DownstreamJobPublisher = {
      enqueueAi: (payload) => {
        aiJobs.push(payload);
        return Promise.resolve();
      },
      enqueueOcr: (payload) => {
        ocrJobs.push(payload);
        return Promise.resolve();
      },
    };

    const pluginRegistry = new PluginRegistryService();
    await pluginRegistry.onModuleInit();

    const objectStorageRoot = '/tmp/openeventhub-crawl-processing-test';
    await fs.rm(objectStorageRoot, { recursive: true, force: true });
    const objectStorageService = new ObjectStorageService();
    objectStorageService.setClientForTests(new FsObjectStorageClient(objectStorageRoot));

    const service = new CrawlProcessingService(
      new SourceRepository(stub.prisma),
      stub.prisma,
      objectStorageService,
      pluginRegistry,
      downstream,
    );

    await service.process({ sourceId } satisfies CrawlJobPayload);

    assert.equal(stub.getCrawlJob().status, CrawlJobStatus.completed);
    assert.equal(stub.getCrawlResult().status, CrawlResultStatus.success);
    assert.equal(stub.getCrawlResult().objectKey, objectKey);
    assert.equal(aiJobs.length, 1);
    assert.equal(ocrJobs.length, 0);
    assert.match(aiJobs[0]?.content ?? '', /Open Air/);

    const stored = await fs.readFile(path.join(objectStorageRoot, objectKey));
    assert.deepEqual(stored, fixtureContent);
  });

  it('skips unchanged content by content hash', async () => {
    const fixturePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      'fixtures/fixture.rss',
    );
    const fixtureContent = await fs.readFile(fixturePath);
    const contentHash = crypto.createHash('sha256').update(fixtureContent).digest('hex');
    const sourceId = '11111111-1111-4111-8111-111111111111';
    const crawlJobId = '22222222-2222-4222-8222-222222222222';
    const priorKey = `crawl-results/prior/${contentHash}`;

    const stub = createPrismaStub({
      sourceId,
      crawlJobId,
      priorSuccess: { objectKey: priorKey, contentHash },
      source: {
        id: sourceId,
        name: 'Fixture RSS',
        pluginType: 'rss',
        url: `file://${fixturePath}`,
        scheduleCron: null,
        config: {},
        status: 'healthy',
        lastCrawlAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const aiJobs: AiJobPayload[] = [];
    const downstream: DownstreamJobPublisher = {
      enqueueAi: (payload) => {
        aiJobs.push(payload);
        return Promise.resolve();
      },
      enqueueOcr: () => Promise.resolve(),
    };

    const pluginRegistry = new PluginRegistryService();
    await pluginRegistry.onModuleInit();

    const objectStorageService = new ObjectStorageService();
    objectStorageService.setClientForTests(
      new FsObjectStorageClient('/tmp/openeventhub-crawl-skip-test'),
    );

    const service = new CrawlProcessingService(
      new SourceRepository(stub.prisma),
      stub.prisma,
      objectStorageService,
      pluginRegistry,
      downstream,
    );

    await service.process({ sourceId });

    assert.equal(stub.getCrawlResult().status, CrawlResultStatus.skipped);
    assert.equal(stub.getCrawlResult().objectKey, priorKey);
    assert.equal(aiJobs.length, 0);
  });
});
