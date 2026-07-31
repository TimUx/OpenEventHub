import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@openeventhub/service-runtime';

import { AppModule } from './app.module.js';

const SERVICE_NAME = 'search';
const PORT = Number(process.env.PORT ?? 3006);

async function bootstrap(): Promise<void> {
  const logger = createLogger(SERVICE_NAME);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.listen(PORT);
  logger.info({ port: PORT }, 'search service listening');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
