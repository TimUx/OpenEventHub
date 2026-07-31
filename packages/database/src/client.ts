import { PrismaClient } from '@prisma/client';

let prismaSingleton: PrismaClient | undefined;

export type PrismaClientOptions = {
  datasourceUrl?: string;
};

export function createPrismaClient(options?: PrismaClientOptions): PrismaClient {
  if (options?.datasourceUrl) {
    return new PrismaClient({
      datasources: {
        db: { url: options.datasourceUrl },
      },
    });
  }

  return new PrismaClient();
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
