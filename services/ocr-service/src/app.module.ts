import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import { QUEUE_NAMES } from '@openeventhub/shared';

import { TesseractJsOcrEngine } from './adapters/tesseract-js.ocr.engine.js';
import type { AiJobPublisher } from './ai-job.publisher.js';
import { BullAiJobPublisher } from './bull-ai-job.publisher.js';
import { OcrProcessingService } from './ocr-processing.service.js';
import { ObjectStorageService } from './object-storage/object-storage.service.js';
import { OCR_ENGINE, type OcrEngine } from './ports/ocr.engine.js';
import { probeTcp } from './probe-tcp.js';
import { OcrQueueProcessor } from './queue/ocr-queue.processor.js';

const SERVICE_NAME = 'ocr-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.5.0';

export const AI_JOB_PUBLISHER = Symbol('AI_JOB_PUBLISHER');

@Module({
  imports: [
    ServiceRuntimeModule.register({
      serviceName: SERVICE_NAME,
      version: SERVICE_VERSION,
      readinessChecks: async () => ({
        redis: await probeTcp(
          process.env.REDIS_HOST ?? 'redis',
          Number(process.env.REDIS_PORT_INTERNAL ?? 6379),
        ),
        objectStorage: await probeTcp(
          process.env.OBJECT_STORAGE_HOST ?? 'object-storage',
          Number(process.env.OBJECT_STORAGE_PORT_INTERNAL ?? 8333),
        ),
      }),
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT_INTERNAL ?? process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.ocr }, { name: QUEUE_NAMES.ai }),
  ],
  providers: [
    ObjectStorageService,
    {
      provide: OCR_ENGINE,
      useFactory: () => new TesseractJsOcrEngine(),
    },
    BullAiJobPublisher,
    {
      provide: AI_JOB_PUBLISHER,
      useExisting: BullAiJobPublisher,
    },
    {
      provide: OcrProcessingService,
      inject: [ObjectStorageService, OCR_ENGINE, AI_JOB_PUBLISHER],
      useFactory: (
        objectStorage: ObjectStorageService,
        engine: OcrEngine,
        aiJobs: AiJobPublisher,
      ) => new OcrProcessingService(objectStorage, engine, aiJobs),
    },
    OcrQueueProcessor,
  ],
})
export class AppModule {}
