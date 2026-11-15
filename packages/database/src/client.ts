import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let prismaSingleton: PrismaClient | undefined;

export type PrismaClientOptions = {
  /** Connection URL; defaults to DATABASE_URL. */
  datasourceUrl?: string;
};

/**
 * Prisma 7 connects through a driver adapter; the connection URL is no longer part of the
 * schema. Every service and script creates its client here so the adapter setup stays in one place.
 */
export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  // Like before, the connection is opened on the first query, so building a module without a
  // database (e.g. probe tests) still works.
  const connectionString = options?.datasourceUrl ?? process.env.DATABASE_URL;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function getPrismaClient(): PrismaClient {
  prismaSingleton ??= createPrismaClient();
  return prismaSingleton;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = undefined;
  }
}
