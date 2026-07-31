import { Module } from '@nestjs/common';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';

import { probeTcp } from './probe-tcp.js';

const SERVICE_NAME = 'crawler';
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
        minio: await probeTcp(
          process.env.MINIO_HOST ?? 'minio',
          Number(process.env.MINIO_PORT_INTERNAL ?? 9000),
        ),
      }),
    }),
  ],
})
export class AppModule {}
