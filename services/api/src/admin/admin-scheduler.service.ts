import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { SourceRepository } from '@openeventhub/database';
import { QUEUE_NAMES, type CrawlJobPayload } from '@openeventhub/shared';

@Injectable()
export class AdminSchedulerService {
  private readonly logger = new Logger('AdminSchedulerService');

  constructor(
    private readonly sources: SourceRepository,
    @InjectQueue(QUEUE_NAMES.crawl) private readonly crawlQueue: Queue<CrawlJobPayload>,
  ) {}

  async listRepeatable() {
    const jobs = await this.crawlQueue.getRepeatableJobs();
    return jobs.map((job) => ({
      key: job.key,
      name: job.name,
      id: job.id,
      pattern: job.pattern,
      next: job.next,
      tz: job.tz,
    }));
  }

  async reloadFromSources(): Promise<{ scheduled: number }> {
    const sources = await this.sources.list();
    const repeatable = sources.filter(
      (source) => Boolean(source.scheduleCron) && source.status !== 'disabled',
    );

    const existing = await this.crawlQueue.getRepeatableJobs();
    await Promise.all(existing.map((job) => this.crawlQueue.removeRepeatableByKey(job.key)));

    await Promise.all(
      repeatable.map(async (source) => {
        await this.crawlQueue.add(
          'crawl',
          { sourceId: source.id } satisfies CrawlJobPayload,
          {
            jobId: `source:${source.id}`,
            repeat: {
              pattern: source.scheduleCron as string,
              tz: 'UTC',
            },
            removeOnComplete: true,
          },
        );
      }),
    );

    this.logger.log(`Reloaded scheduler for ${repeatable.length} source(s)`);
    return { scheduled: repeatable.length };
  }

  async enqueueCrawl(sourceId: string): Promise<{ jobId?: string }> {
    const job = await this.crawlQueue.add(
      'crawl',
      { sourceId } satisfies CrawlJobPayload,
      { removeOnComplete: 100, removeOnFail: 50 },
    );
    return job.id ? { jobId: job.id } : {};
  }
}
