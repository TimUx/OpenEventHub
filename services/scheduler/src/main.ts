import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { createLogger } from '@openeventhub/service-runtime';

import { AppModule } from './app.module.js';

const SERVICE_NAME = 'scheduler';
const PORT = Number(process.env.PORT ?? 3001);

async function bootstrap(): Promise<void> {
  const logger = createLogger(SERVICE_NAME);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  await app.listen(PORT);
  logger.info({ port: PORT }, 'scheduler service listening');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
