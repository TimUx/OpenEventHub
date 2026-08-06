import type { PrismaClient, Region, RegionType } from '@prisma/client';

export type RegionWriteInput = {
  readonly name: string;
  readonly slug: string;
  readonly type: RegionType;
  readonly parentId?: string | null;
  readonly isoCode?: string | null;
};

export type RegionUpdateInput = {
  readonly name?: string;
  readonly slug?: string;
  readonly type?: RegionType;
  readonly parentId?: string | null;
  readonly isoCode?: string | null;
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

  create(data: RegionWriteInput): Promise<Region> {
    return this.prisma.region.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
        parentId: data.parentId ?? null,
        isoCode: data.isoCode ?? null,
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
      },
    });
  }

  delete(id: string): Promise<Region> {
    return this.prisma.region.delete({ where: { id } });
  }

  countChildren(id: string): Promise<number> {
    return this.prisma.region.count({ where: { parentId: id } });
  }
}
