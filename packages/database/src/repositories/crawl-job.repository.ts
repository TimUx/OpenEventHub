import type { Prisma, PrismaClient, CrawlJob } from '@prisma/client';

export class CrawlJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.CrawlJobCreateInput): Promise<CrawlJob> {
    return this.prisma.crawlJob.create({ data });
  }

  findById(id: string): Promise<CrawlJob | null> {
    return this.prisma.crawlJob.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.CrawlJobUpdateInput): Promise<CrawlJob> {
    return this.prisma.crawlJob.update({ where: { id }, data });
  }
}

