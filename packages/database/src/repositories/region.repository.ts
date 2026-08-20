import type { PrismaClient, Region, RegionType } from '@prisma/client';

export type RegionWriteInput = {
  readonly name: string;
  readonly slug: string;
  readonly type: RegionType;
  readonly parentId?: string | null;
  readonly isoCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
};

export type RegionUpdateInput = {
  readonly name?: string;
  readonly slug?: string;
  readonly type?: RegionType;
  readonly parentId?: string | null;
  readonly isoCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
};

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

  findByNameTypeParent(
    name: string,
    type: RegionType,
    parentId: string | null,
  ): Promise<Region | null> {
    return this.prisma.region.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        type,
        parentId,
      },
    });
  }

  async allocateUniqueSlug(base: string): Promise<string> {
    const normalized = base.trim().toLowerCase() || 'region';
    let candidate = normalized;
    let suffix = 2;
    while (await this.findBySlug(candidate)) {
      candidate = `${normalized}-${suffix}`.slice(0, 80);
      suffix += 1;
    }
    return candidate;
  }

  create(data: RegionWriteInput): Promise<Region> {
    return this.prisma.region.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
        parentId: data.parentId ?? null,
        isoCode: data.isoCode ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      },
    });
  }

  update(id: string, data: RegionUpdateInput): Promise<Region> {
    return this.prisma.region.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.isoCode !== undefined ? { isoCode: data.isoCode } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
      },
    });
  }

  listMissingCoordinates(limit = 200): Promise<Region[]> {
    const take = Math.min(Math.max(limit, 1), 1000);
    return this.prisma.region.findMany({
      where: {
        OR: [{ latitude: null }, { longitude: null }],
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  delete(id: string): Promise<Region> {
    return this.prisma.region.delete({ where: { id } });
  }

  countChildren(id: string): Promise<number> {
    return this.prisma.region.count({ where: { parentId: id } });
  }

  findManyByIds(ids: readonly string[]): Promise<Region[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.region.findMany({ where: { id: { in: [...ids] } } });
  }

  async updateParentMany(
    ids: readonly string[],
    parentId: string | null,
  ): Promise<{ updated: number; ids: string[] }> {
    if (ids.length === 0) {
      return { updated: 0, ids: [] };
    }
    const result = await this.prisma.region.updateMany({
      where: { id: { in: [...ids] } },
      data: { parentId },
    });
    return { updated: result.count, ids: [...ids] };
  }

  async deleteMany(ids: readonly string[]): Promise<{ deleted: number; ids: string[] }> {
    if (ids.length === 0) {
      return { deleted: 0, ids: [] };
    }
    const result = await this.prisma.region.deleteMany({
      where: { id: { in: [...ids] } },
    });
    return { deleted: result.count, ids: [...ids] };
  }

  /** How many regions have a parent among `ids` (any child of the batch). */
  countChildrenOfIds(ids: readonly string[]): Promise<number> {
    if (ids.length === 0) return Promise.resolve(0);
    return this.prisma.region.count({
      where: { parentId: { in: [...ids] } },
    });
  }
}
