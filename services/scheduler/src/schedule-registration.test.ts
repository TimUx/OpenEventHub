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

import { CrawlSchedulerService } from './crawl-scheduler.service.js';

describe('BullMQ 6 schedule registration', () => {
  for (const enabled of [true, false]) {
    it(`removes old ticks and registers ${enabled ? 'distinct enabled schedules' : 'no disabled schedules'}`, async () => {
      const queue = {
        getJobSchedulers: async () => [{ key: 'old-tick' }],
        removeJobScheduler: mock.fn(async (_key: string) => true),
        upsertJobScheduler: mock.fn<Queue['upsertJobScheduler']>(),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: CrawlSchedulerService,
            useFactory: (sources: SourceRepository, crawlQueue: Queue<CrawlJobPayload>) =>
              new CrawlSchedulerService(sources, crawlQueue),
            inject: [SourceRepository, getQueueToken(QUEUE_NAMES.crawl)],
          },
          {
            provide: SourceRepository,
            useValue: {
              list: async () => [
                { status: enabled ? 'active' : 'disabled', scheduleCron: '0 * * * *' },
                { status: enabled ? 'active' : 'disabled', scheduleCron: '0 * * * *' },
                { status: 'disabled', scheduleCron: '0 6 * * *' },
              ],
            },
          },
          { provide: getQueueToken(QUEUE_NAMES.crawl), useValue: queue },
        ],
      }).compile();
      try {
        await moduleRef.get(CrawlSchedulerService).onModuleInit();
        assert.deepEqual(queue.removeJobScheduler.mock.calls[0]?.arguments, ['old-tick']);
        assert.equal(queue.upsertJobScheduler.mock.callCount(), enabled ? 1 : 0);
        if (enabled) {
          assert.deepEqual(queue.upsertJobScheduler.mock.calls[0]?.arguments, [
            crawlScheduleRepeatableJobId('0 * * * *'),
            { pattern: '0 * * * *', tz: 'UTC' },
            {
              name: 'crawl',
              data: { scheduleCron: '0 * * * *' },
              opts: { removeOnComplete: true },
            },
          ]);
        }
      } finally {
        await moduleRef.close();
      }
    });
  }
});
