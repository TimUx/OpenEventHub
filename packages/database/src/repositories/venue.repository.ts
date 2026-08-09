import type { Prisma, PrismaClient, Venue } from '@prisma/client';

export type VenueListOptions = {
  readonly q?: string;
  readonly limit?: number;
};

export type VenueWriteInput = {
  readonly name: string;
  readonly slug: string;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly regionId?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
};

export type VenueUpdateInput = {
  readonly name?: string;
  readonly slug?: string;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly regionId?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
};

export class VenueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(options: VenueListOptions = {}): Promise<Venue[]> {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const q = options.q?.trim();
    const where: Prisma.VenueWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.venue.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      take,
    });
  }

  findById(id: string): Promise<Venue | null> {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Venue | null> {
    return this.prisma.venue.findUnique({ where: { slug } });
  }

  findByName(name: string): Promise<Venue | null> {
    return this.prisma.venue.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
  }

  async allocateUniqueSlug(base: string): Promise<string> {
    const normalized = base.trim().toLowerCase() || 'venue';
    let candidate = normalized;
    let suffix = 2;
    while (await this.findBySlug(candidate)) {
      candidate = `${normalized}-${suffix}`.slice(0, 80);
      suffix += 1;
    }
    return candidate;
  }

  create(data: VenueWriteInput): Promise<Venue> {
    return this.prisma.venue.create({
      data: {
        name: data.name,
        slug: data.slug,
        address: data.address ?? null,
        city: data.city ?? null,
        regionId: data.regionId ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      },
    });
  }

  update(id: string, data: VenueUpdateInput): Promise<Venue> {
    return this.prisma.venue.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.regionId !== undefined ? { regionId: data.regionId } : {}),
        ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
        ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
      },
    });
  }

  listMissingCoordinates(limit = 200): Promise<Venue[]> {
    const take = Math.min(Math.max(limit, 1), 1000);
    return this.prisma.venue.findMany({
      where: {
        OR: [{ latitude: null }, { longitude: null }],
      },
      orderBy: { createdAt: 'asc' },
      take,
    });
  }

  /**
   * Find by name (case-insensitive) or create. Optionally refresh city/address.
   */
  async findOrCreate(input: {
    readonly name: string;
    readonly city?: string | null;
    readonly address?: string | null;
    readonly regionId?: string | null;
  }): Promise<Venue> {
    const name = input.name.trim().replace(/\s+/g, ' ');
    const existing = await this.findByName(name);
    if (existing) {
      const city = input.city !== undefined ? input.city : undefined;
      const address = input.address !== undefined ? input.address : undefined;
      const regionId = input.regionId !== undefined ? input.regionId : undefined;
      if (
        (city !== undefined && city !== existing.city) ||
        (address !== undefined && address !== existing.address) ||
        (regionId !== undefined && regionId !== existing.regionId)
      ) {
        return this.update(existing.id, {
          ...(city !== undefined ? { city } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(regionId !== undefined ? { regionId } : {}),
        });
      }
      return existing;
    }

    const slug = await this.allocateUniqueSlug(
      name
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'venue',
    );

    return this.create({
      name,
      slug,
      city: input.city ?? null,
      address: input.address ?? null,
      regionId: input.regionId ?? null,
    });
  }
}
