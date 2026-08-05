import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';

import { SourceRepository, PrismaClient } from '@openeventhub/database';
import { QUEUE_NAMES } from '@openeventhub/shared';

import { CrawlSchedulerService } from './crawl-scheduler.service.js';
import { probeTcp } from './probe-tcp.js';

const SERVICE_NAME = 'scheduler';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.5.0';

@Module({
  imports: [
    ServiceRuntimeModule.register({
      serviceName: SERVICE_NAME,
      version: SERVICE_VERSION,
      readinessChecks: async () => ({
        postgres: await probeTcp(
          process.env.POSTGRES_HOST ?? 'postgres',
          Number(process.env.POSTGRES_PORT_INTERNAL ?? 5432),
        ),
        redis: await probeTcp(
          process.env.REDIS_HOST ?? 'redis',
          Number(process.env.REDIS_PORT_INTERNAL ?? 6379),
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
    BullModule.registerQueue({ name: QUEUE_NAMES.crawl }),
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
    CrawlSchedulerService,
  ],
})
export class AppModule {}
