/**
 * Service identifiers used across Compose, Stack, Traefik, and metrics.
 * Names must stay aligned with docs/CONTAINERS.md.
 */

export const SERVICE_NAMES = {
  frontend: 'frontend',
  admin: 'admin',
  api: 'api',
  scheduler: 'scheduler',
  crawler: 'crawler',
  worker: 'worker',
  aiService: 'ai-service',
  ocrService: 'ocr-service',
  search: 'search',
  postgres: 'postgres',
  redis: 'redis',
  objectStorage: 'object-storage',
  traefik: 'traefik',
} as const;

export type ServiceName = (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES];

export const APPLICATION_SERVICES = [
  SERVICE_NAMES.frontend,
  SERVICE_NAMES.admin,
  SERVICE_NAMES.api,
  SERVICE_NAMES.scheduler,
  SERVICE_NAMES.crawler,
  SERVICE_NAMES.worker,
  SERVICE_NAMES.aiService,
  SERVICE_NAMES.ocrService,
  SERVICE_NAMES.search,
] as const;

export const INFRASTRUCTURE_SERVICES = [
  SERVICE_NAMES.postgres,
  SERVICE_NAMES.redis,
  SERVICE_NAMES.objectStorage,
  SERVICE_NAMES.traefik,
] as const;
