import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import {
  AdminUserRepository,
  AiSettingsRepository,
  CategoryRepository,
  CrawlJobRepository,
  EventRepository,
  ModerationRepository,
  PrismaClient,
  RegionRepository,
  SourceRepository,
  SubmissionRepository,
} from '@openeventhub/database';
import { QUEUE_NAMES } from '@openeventhub/shared';

import { AdminAiController } from './admin/admin-ai.controller.js';
import { AdminDashboardController } from './admin/admin-dashboard.controller.js';
import { AdminModerationController } from './admin/admin-moderation.controller.js';
import {
  AdminCrawlerController,
  AdminQueuesController,
  AdminSchedulerController,
} from './admin/admin-ops.controller.js';
import { AdminQueuesService } from './admin/admin-queues.service.js';
import { AdminSchedulerService } from './admin/admin-scheduler.service.js';
import { AdminSourcesController } from './admin/admin-sources.controller.js';
import { AdminUsersController } from './admin/admin-users.controller.js';
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
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.8.0';

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
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT_INTERNAL ?? process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.discovery },
      { name: QUEUE_NAMES.crawl },
      { name: QUEUE_NAMES.ocr },
      { name: QUEUE_NAMES.ai },
      { name: QUEUE_NAMES.geocoding },
      { name: QUEUE_NAMES.searchIndex },
      { name: QUEUE_NAMES.notifications },
    ),
  ],
  controllers: [
    AuthController,
    AdminAiController,
    AdminDashboardController,
    AdminSourcesController,
    AdminModerationController,
    AdminUsersController,
    AdminCrawlerController,
    AdminSchedulerController,
    AdminQueuesController,
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
    {
      provide: SourceRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new SourceRepository(prisma),
    },
    {
      provide: CrawlJobRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new CrawlJobRepository(prisma),
    },
    {
      provide: ModerationRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new ModerationRepository(prisma),
    },
    {
      provide: AdminUserRepository,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => new AdminUserRepository(prisma),
    },
    AuditService,
    EventsService,
    AdminSchedulerService,
    AdminQueuesService,
    AdminJwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
