import type { Event, Prisma, PrismaClient } from '@prisma/client';
import { EventStatus } from '@prisma/client';

export type EventListOptions = {
  readonly limit?: number;
  readonly offset?: number;
};

export type EventSearchOptions = EventListOptions & {
  readonly q: string;
};

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

  findPublishedById(id: string): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: { id, status: EventStatus.published },
    });
  }

  listPublished(options: EventListOptions = {}): Promise<Event[]> {
    const take = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const skip = Math.max(options.offset ?? 0, 0);
    return this.prisma.event.findMany({
      where: { status: EventStatus.published },
      orderBy: { startAt: 'asc' },
      take,
      skip,
    });
  }

  searchPublished(options: EventSearchOptions): Promise<Event[]> {
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
        ],
      },
      orderBy: { startAt: 'asc' },
      take,
      skip,
    });
  }
}
