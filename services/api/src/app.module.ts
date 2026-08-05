import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import {
  AiSettingsRepository,
  CategoryRepository,
  EventRepository,
  PrismaClient,
  RegionRepository,
  SubmissionRepository,
} from '@openeventhub/database';

import { AdminAiController } from './admin/admin-ai.controller.js';
import { AuditService } from './audit/audit.service.js';
import { AdminJwtAuthGuard } from './auth/admin-jwt.guard.js';
import { AuthController } from './auth/auth.controller.js';
import { RolesGuard } from './auth/roles.guard.js';
import { CategoriesController } from './categories/categories.controller.js';
import { EventsController } from './events/events.controller.js';
import { EventsService } from './events/events.service.js';
import { GraphQlController } from './graphql/graphql.controller.js';
import { RegionsController } from './regions/regions.controller.js';
import { SearchController } from './search/search.controller.js';
import { SubmissionsController } from './submissions/submissions.controller.js';
import { probeTcp } from './probe-tcp.js';

const SERVICE_NAME = 'api';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.6.0';

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
    JwtModule.register({
      global: true,
      secret: process.env.AUTH_JWT_SECRET ?? 'dev-only-change-me-auth-jwt-secret',
      signOptions: { expiresIn: '12h' },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: Number(process.env.API_RATE_LIMIT_TTL_MS ?? 60_000),
        limit: Number(process.env.API_RATE_LIMIT ?? 120),
        skipIf: (context) => {
          const request = context.switchToHttp().getRequest<{ url?: string }>();
          const path = (request.url ?? '').split('?')[0] ?? '';
          return path === '/health' || path === '/ready' || path === '/metrics';
        },
      },
    ]),
  ],
  controllers: [
    AuthController,
    AdminAiController,
    EventsController,
    CategoriesController,
    RegionsController,
    SearchController,
    SubmissionsController,
    GraphQlController,
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
      provide: EventRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new EventRepository(prisma),
    },
    {
      provide: CategoryRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new CategoryRepository(prisma),
    },
    {
      provide: RegionRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new RegionRepository(prisma),
    },
    {
      provide: SubmissionRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new SubmissionRepository(prisma),
    },
    AuditService,
    EventsService,
    AdminJwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
