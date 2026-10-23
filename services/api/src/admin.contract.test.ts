import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';

import { SourceRepository } from '@openeventhub/database';
import {
  QUEUE_NAMES,
  crawlScheduleRepeatableJobId,
  type CrawlJobPayload,
} from '@openeventhub/shared';

import { AdminQueuesService } from './admin/admin-queues.service.js';
import { AdminSchedulerService } from './admin/admin-scheduler.service.js';

describe('admin ops contracts', () => {
  it('exposes all documented worker queues for visibility', () => {
    const names = Object.values(QUEUE_NAMES);
    for (const required of [
      'discovery',
      'crawl',
      'ocr',
      'ai',
      'geocoding',
      'search-index',
      'notifications',
    ]) {
      assert.ok(names.includes(required as (typeof names)[number]), `missing queue ${required}`);
    }
  });

  describe('BullMQ 6 admin contracts', () => {
    it('lists schedules, reloads distinct enabled UTC ticks and preserves manual crawls', async () => {
      const scheduler = {
        key: 'legacy-key',
        name: 'crawl',
        id: 'legacy-id',
        pattern: '0 * * * *',
        next: 123,
        tz: 'UTC',
      };
      const queue = {
        getJobSchedulers: mock.fn(async () => [scheduler]),
        removeJobScheduler: mock.fn(async (_key: string) => true),
        upsertJobScheduler: mock.fn<Queue['upsertJobScheduler']>(),
        add: mock.fn(async () => ({ id: 'manual-job' })),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: AdminSchedulerService,
            useFactory: (sources: SourceRepository, crawlQueue: Queue<CrawlJobPayload>) =>
              new AdminSchedulerService(sources, crawlQueue),
            inject: [SourceRepository, getQueueToken(QUEUE_NAMES.crawl)],
          },
          {
            provide: SourceRepository,
            useValue: {
              list: async () => [
                { status: 'active', scheduleCron: '0 * * * *' },
                { status: 'active', scheduleCron: '0 * * * *' },
                { status: 'disabled', scheduleCron: '0 6 * * *' },
                { status: 'active', scheduleCron: null },
              ],
            },
          },
          { provide: getQueueToken(QUEUE_NAMES.crawl), useValue: queue },
        ],
      }).compile();
      try {
        const service = moduleRef.get(AdminSchedulerService);
        assert.deepEqual(await service.listRepeatable(), [scheduler]);
        assert.deepEqual(await service.reloadFromSources(), { scheduled: 1 });
        assert.deepEqual(queue.removeJobScheduler.mock.calls[0]?.arguments, ['legacy-key']);
        assert.deepEqual(queue.upsertJobScheduler.mock.calls[0]?.arguments, [
          crawlScheduleRepeatableJobId('0 * * * *'),
          { pattern: '0 * * * *', tz: 'UTC' },
          { name: 'crawl', data: { scheduleCron: '0 * * * *' }, opts: { removeOnComplete: true } },
        ]);
        assert.equal(queue.upsertJobScheduler.mock.callCount(), 1);
        assert.deepEqual(await service.enqueueCrawl('source-id'), { jobId: 'manual-job' });
        assert.deepEqual(queue.add.mock.calls[0]?.arguments, [
          'crawl',
          { sourceId: 'source-id' },
          { removeOnComplete: 100, removeOnFail: 50 },
        ]);
      } finally {
        await moduleRef.close();
      }
    });

    it('keeps paused counts in the admin response without requesting the removed job type', async () => {
      let paused = false;
      const queue = {
        getJobCounts: mock.fn(async (...types: string[]) => {
          assert.ok(!types.includes('paused'));
          return { waiting: 3, active: 1, completed: 2, failed: 4, delayed: 5 };
        }),
        isPaused: async () => paused,
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AdminQueuesService,
          ...Object.values(QUEUE_NAMES).map((name) => ({
            provide: getQueueToken(name),
            useValue: queue,
          })),
        ],
      }).compile();
      try {
        const service = moduleRef.get(AdminQueuesService);
        const running = await service.listCounts();
        assert.equal(running[0]?.counts.waiting, 3);
        assert.equal(running[0]?.counts.paused, 0);
        paused = true;
        const stopped = await service.listCounts();
        assert.deepEqual(stopped[0]?.counts, {
          waiting: 0,
          active: 1,
          completed: 2,
          failed: 4,
          delayed: 5,
          paused: 3,
        });
      } finally {
        await moduleRef.close();
      }
    });
  });
});
