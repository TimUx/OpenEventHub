import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaClient } from '@openeventhub/database';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import { QUEUE_NAMES } from '@openeventhub/shared';

import { GeocodingQueueProcessor } from './geocoding/geocoding-queue.processor.js';
import { GeocodingService } from './geocoding/geocoding.service.js';
import { probeTcp } from './probe-tcp.js';

const SERVICE_NAME = 'worker';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.1.0';

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
      }),
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT_INTERNAL ?? process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.geocoding }),
  ],
  providers: [
    {
      provide: PrismaClient,
      useFactory: () => new PrismaClient(),
    },
    GeocodingService,
    GeocodingQueueProcessor,
  ],
})
export class AppModule {}
