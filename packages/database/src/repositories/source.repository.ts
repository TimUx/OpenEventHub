import type { Prisma, PrismaClient, Source } from '@prisma/client';

export class SourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.SourceCreateInput): Promise<Source> {
    return this.prisma.source.create({ data });
  }

  findById(id: string): Promise<Source | null> {
    return this.prisma.source.findUnique({ where: { id } });
  }

  list(): Promise<Source[]> {
    return this.prisma.source.findMany({ orderBy: { name: 'asc' } });
  }

  updateLastCrawlAt(sourceId: string, lastCrawlAt: Date): Promise<Source> {
    return this.prisma.source.update({
      where: { id: sourceId },
      data: {
        lastCrawlAt,
        lastError: null,
      },
    });
  }

  updateLastError(sourceId: string, lastError: string): Promise<Source> {
    return this.prisma.source.update({
      where: { id: sourceId },
      data: {
        lastError,
      },
    });
  }
}
