import type { CrawlJob, Prisma, PrismaClient } from '@prisma/client';
import { CrawlJobStatus } from '@prisma/client';

export class CrawlJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.CrawlJobCreateInput): Promise<CrawlJob> {
    return this.prisma.crawlJob.create({ data });
  }

  createQueued(sourceId: string, scheduledAt = new Date()): Promise<CrawlJob> {
    return this.prisma.crawlJob.create({
      data: {
        status: CrawlJobStatus.queued,
        scheduledAt,
        source: { connect: { id: sourceId } },
      },
    });
  }

  findById(id: string): Promise<CrawlJob | null> {
    return this.prisma.crawlJob.findUnique({ where: { id } });
  }

  listRecent(limit = 50): Promise<Array<CrawlJob & { source: { id: string; name: string } }>> {
    const take = Math.min(Math.max(limit, 1), 200);
    return this.prisma.crawlJob.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        source: { select: { id: true, name: true } },
      },
    });
  }

  listFailedRecent(
    limit = 20,
  ): Promise<Array<CrawlJob & { source: { id: string; name: string } }>> {
    const take = Math.min(Math.max(limit, 1), 100);
    return this.prisma.crawlJob.findMany({
      where: { status: CrawlJobStatus.failed },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        source: { select: { id: true, name: true } },
      },
    });
  }

  countByStatus(): Promise<Record<string, number>> {
    return this.prisma.crawlJob
      .groupBy({ by: ['status'], _count: { _all: true } })
      .then((rows) => Object.fromEntries(rows.map((row) => [row.status, row._count._all])));
  }

  update(id: string, data: Prisma.CrawlJobUpdateInput): Promise<CrawlJob> {
    return this.prisma.crawlJob.update({ where: { id }, data });
  }
}
