import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@openeventhub/service-runtime';

import { AppModule } from './app.module.js';

const SERVICE_NAME = 'ai-service';
const PORT = Number(process.env.PORT ?? 3004);

async function bootstrap(): Promise<void> {
  const logger = createLogger(SERVICE_NAME);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.listen(PORT);
  logger.info({ port: PORT }, 'ai-service service listening');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
