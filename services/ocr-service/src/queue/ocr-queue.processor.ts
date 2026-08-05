import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { QUEUE_NAMES, type OcrJobPayload } from '@openeventhub/shared';

import { OcrProcessingService } from '../ocr-processing.service.js';

@Processor(QUEUE_NAMES.ocr)
export class OcrQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrQueueProcessor.name);

  constructor(private readonly processing: OcrProcessingService) {
    super();
  }

  async process(job: Job<OcrJobPayload>): Promise<unknown> {
    this.logger.log(`Processing OCR job ${job.id ?? ''}`);
    return this.processing.process(job.data);
  }
}
