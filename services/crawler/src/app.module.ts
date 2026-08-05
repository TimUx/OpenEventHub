import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';

import { PrismaClient, SourceRepository } from '@openeventhub/database';
import { QUEUE_NAMES } from '@openeventhub/shared';

import { CrawlQueueProcessor } from './queue/crawl-queue.processor.js';
import { CrawlProcessingService } from './crawl/crawl-processing.service.js';
import { BullDownstreamJobPublisher } from './crawl/bull-downstream-job.publisher.js';
import type { DownstreamJobPublisher } from './crawl/downstream-job.publisher.js';
import { PluginRegistryService } from './plugins/plugin-registry.service.js';
import { ObjectStorageService } from './object-storage/object-storage.service.js';
import { probeTcp } from './probe-tcp.js';

export const DOWNSTREAM_JOB_PUBLISHER = Symbol('DOWNSTREAM_JOB_PUBLISHER');

const SERVICE_NAME = 'crawler';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.5.0';

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
        postgres: await probeTcp(
          process.env.POSTGRES_HOST ?? 'postgres',
          Number(process.env.POSTGRES_PORT_INTERNAL ?? 5432),
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
    BullModule.registerQueue(
      { name: QUEUE_NAMES.crawl },
      { name: QUEUE_NAMES.ai },
      { name: QUEUE_NAMES.ocr },
    ),
  ],
  providers: [
    {
      provide: PrismaClient,
      useFactory: () => new PrismaClient(),
    },
    {
      provide: SourceRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new SourceRepository(prisma),
    },
    ObjectStorageService,
    PluginRegistryService,
    BullDownstreamJobPublisher,
    {
      provide: DOWNSTREAM_JOB_PUBLISHER,
      useExisting: BullDownstreamJobPublisher,
    },
    {
      provide: CrawlProcessingService,
      inject: [
        SourceRepository,
        PrismaClient,
        ObjectStorageService,
        PluginRegistryService,
        DOWNSTREAM_JOB_PUBLISHER,
      ],
      useFactory: (
        sources: SourceRepository,
        prisma: PrismaClient,
        objectStorage: ObjectStorageService,
        plugins: PluginRegistryService,
        downstream: DownstreamJobPublisher,
      ) => new CrawlProcessingService(sources, prisma, objectStorage, plugins, downstream),
    },
    CrawlQueueProcessor,
  ],
})
export class AppModule {}
