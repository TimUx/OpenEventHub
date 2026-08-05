import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { QUEUE_NAMES, type AiJobPayload, type OcrJobPayload } from '@openeventhub/shared';

import type { DownstreamJobPublisher } from './downstream-job.publisher.js';

@Injectable()
export class BullDownstreamJobPublisher implements DownstreamJobPublisher, OnModuleInit {
  private aiQueue!: Queue<AiJobPayload>;
  private ocrQueue!: Queue<OcrJobPayload>;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    this.aiQueue = this.moduleRef.get<Queue<AiJobPayload>>(getQueueToken(QUEUE_NAMES.ai), {
      strict: false,
    });
    this.ocrQueue = this.moduleRef.get<Queue<OcrJobPayload>>(getQueueToken(QUEUE_NAMES.ocr), {
      strict: false,
    });
  }

  enqueueAi(payload: AiJobPayload): Promise<void> {
    return this.aiQueue
      .add('ai', payload, { removeOnComplete: 100, removeOnFail: 50 })
      .then(() => undefined);
  }

  enqueueOcr(payload: OcrJobPayload): Promise<void> {
    return this.ocrQueue
      .add('ocr', payload, { removeOnComplete: 100, removeOnFail: 50 })
      .then(() => undefined);
  }
}
