import type { Prisma, PrismaClient, CrawlResult } from '@prisma/client';

export class CrawlResultRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.CrawlResultCreateInput): Promise<CrawlResult> {
    return this.prisma.crawlResult.create({ data });
  }

  findById(id: string): Promise<CrawlResult | null> {
    return this.prisma.crawlResult.findUnique({ where: { id } });
  }

  /**
   * Returns a prior successful crawl of the same content hash for a source.
   * Used to skip reprocessing unchanged payloads (docs/SCHEDULER.md).
   */
  findSuccessfulBySourceAndHash(
    sourceId: string,
    contentHash: string,
  ): Promise<CrawlResult | null> {
    return this.prisma.crawlResult.findFirst({
      where: {
        contentHash,
        status: 'success',
        crawlJob: { sourceId },
      },
      orderBy: { fetchedAt: 'desc' },
    });
  }
}
