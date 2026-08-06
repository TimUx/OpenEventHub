import type { Category, Event, Prisma, PrismaClient, Venue } from '@prisma/client';
import { EventStatus } from '@prisma/client';

export type EventListOptions = {
  readonly limit?: number;
  readonly offset?: number;
};

export type EventSearchOptions = EventListOptions & {
  readonly q: string;
};

export type EventWithRelations = Event & {
  readonly venue: Venue | null;
  readonly categories: ReadonlyArray<{
    readonly category: Category;
  }>;
};

export type EventUpdateInput = {
  readonly title?: string;
  readonly slug?: string;
  readonly summary?: string | null;
  readonly description?: string | null;
  readonly startAt?: Date;
  readonly endAt?: Date | null;
  readonly status?: EventStatus;
  readonly changeReason?: string | null;
};

const publishedInclude = {
  venue: true,
  categories: {
    include: {
      category: true,
    },
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

  listAll(options: EventListOptions = {}): Promise<Event[]> {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const skip = Math.max(options.offset ?? 0, 0);
    return this.prisma.event.findMany({
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
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
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });

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
