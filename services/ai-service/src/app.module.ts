import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import { QUEUE_NAMES } from '@openeventhub/shared';
import { AiSettingsRepository, PrismaClient } from '@openeventhub/database';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DatabaseBackedLlmProvider } from './adapters/database-backed-llm.provider.js';
import { FilePromptRepository } from './adapters/file-prompt.repository.js';
import { AiProcessingService } from './ai-processing.service.js';
import { GeocodingEnqueueService } from './geocoding-enqueue.service.js';
import { LLM_PROVIDER } from './ports/llm.provider.js';
import { PROMPT_REPOSITORY } from './ports/prompt.repository.js';
import { probeTcp } from './probe-tcp.js';
import { AiQueueProcessor } from './queue/ai-queue.processor.js';

const SERVICE_NAME = 'ai-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.4.1';

function resolvePromptsRoot(): string {
  if (process.env.PROMPTS_DIR) {
    return process.env.PROMPTS_DIR;
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../../../prompts');
}

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
    BullModule.registerQueue({ name: QUEUE_NAMES.ai }),
    BullModule.registerQueue({ name: QUEUE_NAMES.geocoding }),
  ],
  providers: [
    {
      provide: PrismaClient,
      useFactory: () => new PrismaClient(),
    },
    {
      provide: AiSettingsRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new AiSettingsRepository(prisma),
    },
    {
      provide: LLM_PROVIDER,
      inject: [AiSettingsRepository],
      useFactory: (settings: AiSettingsRepository) => new DatabaseBackedLlmProvider(settings),
    },
    {
      provide: PROMPT_REPOSITORY,
      useFactory: () => new FilePromptRepository(resolvePromptsRoot()),
    },
    GeocodingEnqueueService,
    AiProcessingService,
    AiQueueProcessor,
  ],
})
export class AppModule {}
