import { Injectable, NotFoundException } from '@nestjs/common';
import type { EventWithRelations } from '@openeventhub/database';
import { EventRepository } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';

export type PublicEventVenue = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly regionId: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
};

export type PublicEventCategory = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export type PublicEventMedia = {
  readonly id: string;
  readonly type: string;
  readonly url: string | null;
  readonly altText: string | null;
  readonly sortOrder: number;
};

export type PublicEvent = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly allDay: boolean;
  readonly status: string;
  readonly venueId: string | null;
  readonly organizerId: string | null;
  readonly venue: PublicEventVenue | null;
  readonly categories: readonly PublicEventCategory[];
  readonly media: readonly PublicEventMedia[];
};

function toNumber(
  value: { toNumber(): number } | number | string | null | undefined,
): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = value.toNumber();
  return Number.isFinite(parsed) ? parsed : null;
}

export function toPublicEvent(event: EventWithRelations): PublicEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt?.toISOString() ?? null,
    allDay: event.allDay,
    status: event.status,
    venueId: event.venueId,
    organizerId: event.organizerId,
    venue: event.venue
      ? {
          id: event.venue.id,
          name: event.venue.name,
          slug: event.venue.slug,
          address: event.venue.address,
          city: event.venue.city,
          regionId: event.venue.regionId,
          latitude: toNumber(event.venue.latitude),
          longitude: toNumber(event.venue.longitude),
        }
      : null,
    categories: event.categories.map(({ category }) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    })),
    media: (event.media ?? [])
      .filter((row) => Boolean(row.url))
      .map((row) => ({
        id: row.id,
        type: row.type,
        url: row.url,
        altText: row.altText,
        sortOrder: row.sortOrder,
      })),
  };
}

@Injectable()
export class EventsService {
  constructor(
    private readonly events: EventRepository,
    private readonly audit: AuditService,
  ) {}

  async list(limit?: number, offset?: number): Promise<PublicEvent[]> {
    const rows = await this.events.listPublished({
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
    return rows.map(toPublicEvent);
  }

  async getById(id: string): Promise<PublicEvent> {
    const event = await this.events.findPublishedById(id);
    if (!event) {
      throw new NotFoundException(`Event '${id}' not found`);
    }
    this.audit.record({
      action: 'events.read',
      resourceType: 'event',
      resourceId: id,
    });
    return toPublicEvent(event);
  }

  async search(q: string, limit?: number, offset?: number): Promise<PublicEvent[]> {
    const rows = await this.events.searchPublished({
      q,
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
    return rows.map(toPublicEvent);
  }
}
