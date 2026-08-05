import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createLogger } from '@openeventhub/service-runtime';

import { AppModule } from './app.module.js';

const SERVICE_NAME = 'api';
const PORT = Number(process.env.PORT ?? 3000);
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.8.0';

async function bootstrap(): Promise<void> {
  const logger = createLogger(SERVICE_NAME);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const corsOrigins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:8088,http://admin.localhost:8088,http://localhost:3100,http://localhost:3101'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const openApi = new DocumentBuilder()
    .setTitle('OpenEventHub API')
    .setDescription('Versioned public REST API for the Event Intelligence Platform')
    .setVersion(SERVICE_VERSION)
    .addBearerAuth()
    .addServer('/api/v1', 'API v1')
    .build();

  const document = SwaggerModule.createDocument(app, openApi, {
    operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  });
  // OpenAPI 3.1 marker for tooling; Nest currently emits 3.0.x documents.
  (document as { openapi: string }).openapi = '3.1.0';
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.listen(PORT);
  logger.info({ port: PORT }, 'api service listening');
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
