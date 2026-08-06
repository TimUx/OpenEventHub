import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { SourceRepository } from '@openeventhub/database';
import {
  QUEUE_NAMES,
  crawlScheduleRepeatableJobId,
  uniqueEnabledScheduleCrons,
  type CrawlJobPayload,
} from '@openeventhub/shared';

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
    const patterns = uniqueEnabledScheduleCrons(sources);

    if (patterns.length === 0) {
      this.logger.log('No sources with scheduleCron found; scheduler will stay idle.');
      return;
    }

    // Remove stale repeatable jobs, then register one tick per distinct cron.
    const existing = await this.crawlQueue.getRepeatableJobs();
    await Promise.all(existing.map((job) => this.crawlQueue.removeRepeatableByKey(job.key)));

    await Promise.all(
      patterns.map(async (scheduleCron) => {
        await this.crawlQueue.add(
          'crawl',
          { scheduleCron } satisfies CrawlJobPayload,
          {
            jobId: crawlScheduleRepeatableJobId(scheduleCron),
            repeat: {
              pattern: scheduleCron,
              tz: 'UTC',
            },
            removeOnComplete: true,
          },
        );
      }),
    );

    this.logger.log(
      `Scheduled ${patterns.length} crawl schedule tick(s) covering ${sources.filter((s) => s.scheduleCron && s.status !== 'disabled').length} source(s)`,
    );
  }
}
