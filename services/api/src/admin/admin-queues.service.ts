import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { QUEUE_NAMES } from '@openeventhub/shared';

type QueueCounts = {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
  readonly paused: number;
};

@Injectable()
export class AdminQueuesService {
  constructor(
    @InjectQueue(QUEUE_NAMES.crawl) private readonly crawl: Queue,
    @InjectQueue(QUEUE_NAMES.ocr) private readonly ocr: Queue,
    @InjectQueue(QUEUE_NAMES.ai) private readonly ai: Queue,
    @InjectQueue(QUEUE_NAMES.discovery) private readonly discovery: Queue,
    @InjectQueue(QUEUE_NAMES.geocoding) private readonly geocoding: Queue,
    @InjectQueue(QUEUE_NAMES.searchIndex) private readonly searchIndex: Queue,
    @InjectQueue(QUEUE_NAMES.notifications) private readonly notifications: Queue,
  ) {}

  async listCounts(): Promise<Array<{ name: string; counts: QueueCounts }>> {
    const entries: Array<[string, Queue]> = [
      [QUEUE_NAMES.discovery, this.discovery],
      [QUEUE_NAMES.crawl, this.crawl],
      [QUEUE_NAMES.ocr, this.ocr],
      [QUEUE_NAMES.ai, this.ai],
      [QUEUE_NAMES.geocoding, this.geocoding],
      [QUEUE_NAMES.searchIndex, this.searchIndex],
      [QUEUE_NAMES.notifications, this.notifications],
    ];

    return Promise.all(
      entries.map(async ([name, queue]) => {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        );
        return {
          name,
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            paused: counts.paused ?? 0,
          },
        };
      }),
    );
  }
}
