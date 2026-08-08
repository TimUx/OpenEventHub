import type { PrismaClient, Region } from '@prisma/client';

export class CoverageScopeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listRegionIds(): Promise<string[]> {
    const rows = await this.prisma.coverageScopeRegion.findMany({
      select: { regionId: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.regionId);
  }

  async listRegions(): Promise<Region[]> {
    const rows = await this.prisma.coverageScopeRegion.findMany({
      include: { region: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.region);
  }

  /**
   * Replace the coverage set. Empty array disables geographic filtering.
   */
  async setRegionIds(regionIds: readonly string[]): Promise<string[]> {
    const unique = [...new Set(regionIds.map((id) => id.trim()).filter(Boolean))];
    await this.prisma.$transaction(async (tx) => {
      await tx.coverageScopeRegion.deleteMany();
      if (unique.length > 0) {
        await tx.coverageScopeRegion.createMany({
          data: unique.map((regionId) => ({ regionId })),
        });
      }
    });
    return this.listRegionIds();
  }
}
