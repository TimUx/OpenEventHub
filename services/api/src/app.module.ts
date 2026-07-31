import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ServiceRuntimeModule } from '@openeventhub/service-runtime';
import { AiSettingsRepository, PrismaClient } from '@openeventhub/database';

import { AdminAiController } from './admin/admin-ai.controller.js';
import { AdminJwtAuthGuard } from './auth/admin-jwt.guard.js';
import { AuthController } from './auth/auth.controller.js';
import { probeTcp } from './probe-tcp.js';

const SERVICE_NAME = 'api';
const SERVICE_VERSION = process.env.SERVICE_VERSION ?? '0.4.1';

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
  ],
  controllers: [AuthController, AdminAiController],
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
    AdminJwtAuthGuard,
  ],
})
export class AppModule {}
