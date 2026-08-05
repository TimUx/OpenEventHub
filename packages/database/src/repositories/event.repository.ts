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
