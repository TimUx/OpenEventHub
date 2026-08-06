import { buildCalendarIcs, type IcsEventInput } from '@openeventhub/shared';
import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { EventsService, type PublicEvent } from './events.service.js';

function publicSiteUrl(): string {
  return (
    process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    'http://localhost:8088'
  );
}

function toIcsEvent(event: PublicEvent): IcsEventInput {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startAt: event.startAt,
    endAt: event.endAt,
    venue: event.venue
      ? {
          name: event.venue.name,
          address: event.venue.address,
          city: event.venue.city,
        }
      : null,
  };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function filterEventsForCalendarFeed(
  events: readonly PublicEvent[],
  {
    category = '',
    regionId = '',
    from = '',
    to = '',
  }: {
    readonly category?: string;
    readonly regionId?: string;
    readonly from?: string;
    readonly to?: string;
  },
): PublicEvent[] {
  return events.filter((event) => {
    const day = dayKey(event.startAt);
    if (from && day < from) {
      return false;
    }
    if (to && day > to) {
      return false;
    }
    if (category) {
      const match = event.categories.some(
        (item) => item.id === category || item.slug === category || item.name === category,
      );
      if (!match) {
        return false;
      }
    }
    if (regionId && event.venue?.regionId !== regionId) {
      return false;
    }
    return true;
  });
}

@ApiTags('calendar')
@Controller('api/v1')
export class CalendarFeedController {
  constructor(private readonly events: EventsService) {}

  @Get('calendar.ics')
  @ApiOperation({
    summary:
      'Subscribe to published events as an iCalendar feed (Apple, Google, Outlook, Thunderbird)',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'regionId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'inline; filename="openeventhub.ics"')
  @Header('Cache-Control', 'public, max-age=300')
  async feed(
    @Query('category') category?: string,
    @Query('regionId') regionId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ): Promise<string> {
    const take = limit ? Number(limit) : 100;
    const listed = await this.events.list(Number.isFinite(take) ? take : 100);
    const filtered = filterEventsForCalendarFeed(listed, {
      category: category ?? '',
      regionId: regionId ?? '',
      from: from ?? '',
      to: to ?? '',
    });
    const site = publicSiteUrl();
    const calendarName =
      category || regionId || from || to ? 'OpenEventHub (filtered)' : 'OpenEventHub';

    return buildCalendarIcs(filtered.map(toIcsEvent), {
      calendarName,
      eventUrl: (event) => `${site}/events/${event.id}`,
    });
  }
}
