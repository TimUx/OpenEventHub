import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import { QUEUE_NAMES } from '@openeventhub/shared';
import { PrismaClient } from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FilePromptRepository } from './adapters/file-prompt.repository.js';
import {
  OpenAiCompatibleProvider,
  resolveProviderConfigFromEnv,
} from './adapters/openai-compatible.provider.js';
import { AiProcessingService } from './ai-processing.service.js';
import { LLM_PROVIDER } from './ports/llm.provider.js';
import { PROMPT_REPOSITORY } from './ports/prompt.repository.js';
import { probeTcp } from './probe-tcp.js';
import { AiQueueProcessor } from './queue/ai-queue.processor.js';

const SERVICE_NAME = 'ai-service';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.4.0';

function resolvePromptsRoot(): string {
  if (process.env.PROMPTS_DIR) {
    return process.env.PROMPTS_DIR;
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/ -> service root -> repo root prompts/
  return path.resolve(here, '../../../prompts');
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
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
  ],
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: () => new OpenAiCompatibleProvider(resolveProviderConfigFromEnv()),
    },
    {
      provide: PROMPT_REPOSITORY,
      useFactory: () => new FilePromptRepository(resolvePromptsRoot()),
    },
    {
      provide: PrismaClient,
      useFactory: createPrismaClient,
    },
    AiProcessingService,
    AiQueueProcessor,
  ],
})
export class AppModule {}
