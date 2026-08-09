import type { Category, Event, Media, Prisma, PrismaClient, Venue } from '@prisma/client';
import { EventStatus } from '@prisma/client';

export type EventListOptions = {
  readonly limit?: number;
  readonly offset?: number;
};

export type AdminEventListOptions = EventListOptions & {
  readonly status?: EventStatus;
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly q?: string;
  /** Matches venue name or city (case-insensitive contains). */
  readonly venue?: string;
  readonly allDay?: boolean;
};

export type EventSearchOptions = EventListOptions & {
  readonly q: string;
};

export type EventWithRelations = Event & {
  readonly venue: Venue | null;
  readonly categories: ReadonlyArray<{
    readonly category: Category;
  }>;
  readonly media: readonly Media[];
};

export type EventUpdateInput = {
  readonly title?: string;
  readonly slug?: string;
  readonly summary?: string | null;
  readonly description?: string | null;
  readonly startAt?: Date;
  readonly endAt?: Date | null;
  readonly allDay?: boolean;
  readonly status?: EventStatus;
  readonly venueId?: string | null;
  readonly categoryIds?: readonly string[];
  readonly changeReason?: string | null;
};

const publishedInclude = {
  venue: true,
  categories: {
    include: {
      category: true,
    },
  },
  media: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.EventInclude;

export class EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.EventCreateInput): Promise<Event> {
    return this.prisma.event.create({ data });
  }

  findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { slug } });
  }

  findPublishedById(id: string): Promise<EventWithRelations | null> {
    return this.prisma.event.findFirst({
      where: { id, status: EventStatus.published },
      include: publishedInclude,
    });
  }

  listPublished(options: EventListOptions = {}): Promise<EventWithRelations[]> {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const skip = Math.max(options.offset ?? 0, 0);
    return this.prisma.event.findMany({
      where: { status: EventStatus.published },
      orderBy: { startAt: 'asc' },
      take,
      skip,
      include: publishedInclude,
    });
  }

  listAll(options: AdminEventListOptions = {}): Promise<EventWithRelations[]> {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const skip = Math.max(options.offset ?? 0, 0);
    const q = options.q?.trim();
    const venue = options.venue?.trim();

    const where: Prisma.EventWhereInput = {};
    if (options.status) {
      where.status = options.status;
    }
    if (options.allDay !== undefined) {
      where.allDay = options.allDay;
    }
    if (options.dateFrom || options.dateTo) {
      where.startAt = {
        ...(options.dateFrom ? { gte: options.dateFrom } : {}),
        ...(options.dateTo ? { lte: options.dateTo } : {}),
      };
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (venue) {
      where.venue = {
        OR: [
          { name: { contains: venue, mode: 'insensitive' } },
          { city: { contains: venue, mode: 'insensitive' } },
          { address: { contains: venue, mode: 'insensitive' } },
        ],
      };
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { startAt: 'asc' },
      take,
      skip,
      include: publishedInclude,
    });
  }

  countByStatus(): Promise<Record<string, number>> {
    return this.prisma.event
      .groupBy({ by: ['status'], _count: { _all: true } })
      .then((rows) => Object.fromEntries(rows.map((row) => [row.status, row._count._all])));
  }

  /**
   * Updates an event and appends an EventVersion snapshot (domain versioning).
   */
  updateWithVersion(id: string, data: EventUpdateInput): Promise<Event> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.summary !== undefined ? { summary: data.summary } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
          ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
          ...(data.allDay !== undefined ? { allDay: data.allDay } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.venueId !== undefined ? { venueId: data.venueId } : {}),
        },
      });

      if (data.categoryIds !== undefined) {
        const uniqueIds = [...new Set(data.categoryIds.map((cid) => cid.trim()).filter(Boolean))];
        await tx.eventCategory.deleteMany({ where: { eventId: id } });
        if (uniqueIds.length > 0) {
          await tx.eventCategory.createMany({
            data: uniqueIds.map((categoryId) => ({ eventId: id, categoryId })),
            skipDuplicates: true,
          });
        }
      }

      const last = await tx.eventVersion.findFirst({
        where: { eventId: id },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const versionNumber = (last?.versionNumber ?? 0) + 1;

      await tx.eventVersion.create({
        data: {
          eventId: id,
          versionNumber,
          title: updated.title,
          startAt: updated.startAt,
          endAt: updated.endAt,
          allDay: updated.allDay,
          venueId: updated.venueId,
          organizerId: updated.organizerId,
          confidenceScore: updated.confidenceScore,
          status: updated.status,
          changeReason: data.changeReason ?? 'admin.update',
        },
      });

      return updated;
    });
  }

  delete(id: string): Promise<Event> {
    return this.prisma.event.delete({ where: { id } });
  }

  /**
   * Deletes events whose effective end (endAt ?? startAt) is strictly before `now`.
   * Cascades to versions, sources, analyses, and taxonomy links via Prisma relations.
   */
  async deleteExpired(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.event.deleteMany({
      where: {
        OR: [
          { endAt: { not: null, lt: now } },
          { AND: [{ endAt: null }, { startAt: { lt: now } }] },
        ],
      },
    });
    return result.count;
  }

  searchPublished(options: EventSearchOptions): Promise<EventWithRelations[]> {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const skip = Math.max(options.offset ?? 0, 0);
    const q = options.q.trim();
    if (!q) {
      return this.listPublished({ limit: take, offset: skip });
    }

    return this.prisma.event.findMany({
      where: {
        status: EventStatus.published,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { venue: { name: { contains: q, mode: 'insensitive' } } },
          { venue: { city: { contains: q, mode: 'insensitive' } } },
          {
            categories: {
              some: {
                category: { name: { contains: q, mode: 'insensitive' } },
              },
            },
          },
        ],
      },
      orderBy: { startAt: 'asc' },
      take,
      skip,
      include: publishedInclude,
    });
  }
}
