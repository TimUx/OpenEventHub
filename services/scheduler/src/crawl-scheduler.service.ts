import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { SourceRepository } from '@openeventhub/database';
import { QUEUE_NAMES, type CrawlJobPayload } from '@openeventhub/shared';

const SERVICE_NAME = 'scheduler';

@Injectable()
export class CrawlSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(`${SERVICE_NAME}:crawl-scheduler`);

  constructor(
    private readonly sources: SourceRepository,
    @InjectQueue(QUEUE_NAMES.crawl) private readonly crawlQueue: Queue<CrawlJobPayload>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.scheduleExistingSources();
  }

  private async scheduleExistingSources(): Promise<void> {
    const sources = await this.sources.list();

    const repeatable = sources.filter((source) => Boolean(source.scheduleCron));
    if (repeatable.length === 0) {
      this.logger.log('No sources with scheduleCron found; scheduler will stay idle.');
      return;
    }

    // Remove stale repeatable jobs for this scheduler, then re-register from DB.
    const existing = await this.crawlQueue.getRepeatableJobs();
    await Promise.all(existing.map((job) => this.crawlQueue.removeRepeatableByKey(job.key)));

    await Promise.all(
      repeatable.map(async (source) => {
        await this.crawlQueue.add('crawl', { sourceId: source.id } satisfies CrawlJobPayload, {
          repeat: {
            pattern: source.scheduleCron as string,
            tz: 'UTC',
          },
          removeOnComplete: true,
        });
      }),
    );

    this.logger.log(`Scheduled crawl jobs for ${repeatable.length} source(s)`);
  }
}
