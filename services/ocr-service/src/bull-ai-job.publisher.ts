import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { QUEUE_NAMES, type AiJobPayload } from '@openeventhub/shared';

import type { AiJobPublisher } from './ai-job.publisher.js';

@Injectable()
export class BullAiJobPublisher implements AiJobPublisher, OnModuleInit {
  private aiQueue!: Queue<AiJobPayload>;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit(): void {
    this.aiQueue = this.moduleRef.get<Queue<AiJobPayload>>(getQueueToken(QUEUE_NAMES.ai), {
      strict: false,
    });
  }

  enqueueAi(payload: AiJobPayload): Promise<void> {
    return this.aiQueue
      .add('ai', payload, { removeOnComplete: 100, removeOnFail: 50 })
      .then(() => undefined);
  }
}
