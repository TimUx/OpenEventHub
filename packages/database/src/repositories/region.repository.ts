import type { PrismaClient, Region } from '@prisma/client';

export class RegionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(): Promise<Region[]> {
    return this.prisma.region.findMany({
      orderBy: [{ name: 'asc' }],
    });
  }

  findById(id: string): Promise<Region | null> {
    return this.prisma.region.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Region | null> {
    return this.prisma.region.findUnique({ where: { slug } });
  }
}
