import { Module } from '@nestjs/common';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';

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
      }),
    }),
  ],
})
export class AppModule {}
