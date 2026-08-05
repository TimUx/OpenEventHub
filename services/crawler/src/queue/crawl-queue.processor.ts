import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { QUEUE_NAMES, type CrawlJobPayload } from '@openeventhub/shared';

import { CrawlProcessingService } from '../crawl/crawl-processing.service.js';

@Processor(QUEUE_NAMES.crawl)
export class CrawlQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlQueueProcessor.name);

  constructor(private readonly processing: CrawlProcessingService) {
    super();
  }

  async process(job: Job<CrawlJobPayload>): Promise<void> {
    this.logger.log(`Processing crawl job ${job.id ?? ''}`);
    await this.processing.process(job.data);
  }
}
