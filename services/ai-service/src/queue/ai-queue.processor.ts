import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, type AiJobPayload } from '@openeventhub/shared';
import type { Job } from 'bullmq';

import { AiProcessingService } from '../ai-processing.service.js';

@Processor(QUEUE_NAMES.ai)
export class AiQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(AiQueueProcessor.name);

  constructor(private readonly processing: AiProcessingService) {
    super();
  }

  async process(job: Job<AiJobPayload>): Promise<unknown> {
    this.logger.log(`Processing AI job ${job.id}`);
    const result = await this.processing.processJob(job.data);
    this.logger.log(
      `AI job ${job.id} completed provider=${result.provider} confidence=${result.confidenceScore}`,
    );
    return result;
  }
}
