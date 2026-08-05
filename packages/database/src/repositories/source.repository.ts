import type { Prisma, PrismaClient, Source } from '@prisma/client';
import { SourceStatus } from '@prisma/client';

export type SourceUpdateInput = {
  readonly name?: string;
  readonly pluginType?: string;
  readonly url?: string;
  readonly scheduleCron?: string | null;
  readonly config?: Prisma.InputJsonValue;
  readonly status?: SourceStatus;
};

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

  update(id: string, data: SourceUpdateInput): Promise<Source> {
    return this.prisma.source.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.pluginType !== undefined ? { pluginType: data.pluginType } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.scheduleCron !== undefined ? { scheduleCron: data.scheduleCron } : {}),
        ...(data.config !== undefined ? { config: data.config } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  delete(id: string): Promise<Source> {
    return this.prisma.source.delete({ where: { id } });
  }

  countByStatus(): Promise<Record<string, number>> {
    return this.prisma.source
      .groupBy({ by: ['status'], _count: { _all: true } })
      .then((rows) =>
        Object.fromEntries(rows.map((row) => [row.status, row._count._all])),
      );
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
