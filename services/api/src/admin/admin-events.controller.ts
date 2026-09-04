import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  CategoryRepository,
  EventRepository,
  EventStatus,
  RegionRepository,
  VenueRepository,
} from '@openeventhub/database';
import { buildingLocalityFromLabel, streetLineFromAddress } from '@openeventhub/shared';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { GeocodingEnqueueService } from '../geocoding/geocoding-enqueue.service.js';
import { parseBulkEventIds } from './admin-events.bulk.js';

const EVENT_STATUSES = new Set<string>(Object.values(EventStatus));

type VenuePatchBody = {
  readonly id?: string | null;
  readonly name?: string | null;
  readonly city?: string | null;
  readonly address?: string | null;
  readonly regionId?: string | null;
};

function parseOptionalDate(
  value: string | null | undefined,
  field: string,
): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
  return date;
}

@ApiTags('admin-events')
@ApiBearerAuth()
@Controller('api/v1/admin/events')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminEventsController {
  constructor(
    private readonly events: EventRepository,
    private readonly venues: VenueRepository,
    private readonly regions: RegionRepository,
    private readonly categories: CategoryRepository,
    private readonly geocoding: GeocodingEnqueueService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list(
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('q') q?: string,
    @Query('venue') venue?: string,
    @Query('allDay') allDay?: string,
  ) {
    if (status !== undefined && status !== '' && !EVENT_STATUSES.has(status)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    let parsedAllDay: boolean | undefined;
    if (allDay !== undefined && allDay !== '') {
      if (allDay === 'true' || allDay === '1') parsedAllDay = true;
      else if (allDay === 'false' || allDay === '0') parsedAllDay = false;
      else throw new BadRequestException('Invalid allDay (use true|false)');
    }

    const from = parseOptionalDate(dateFrom || undefined, 'dateFrom');
    const to = parseOptionalDate(dateTo || undefined, 'dateTo');
    // Inclusive end-of-day when only a calendar date is provided.
    let dateToExclusive: Date | undefined;
    if (to && dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo.trim())) {
      dateToExclusive = new Date(to);
      dateToExclusive.setUTCHours(23, 59, 59, 999);
    }

    return this.events.listAll({
      limit: limit ? Number(limit) : 100,
      ...(status ? { status: status as EventStatus } : {}),
      ...(from ? { dateFrom: from } : {}),
      ...(dateToExclusive ? { dateTo: dateToExclusive } : to ? { dateTo: to } : {}),
      ...(q?.trim() ? { q: q.trim() } : {}),
      ...(venue?.trim() ? { venue: venue.trim() } : {}),
      ...(parsedAllDay !== undefined ? { allDay: parsedAllDay } : {}),
    });
  }

  @Get('counts')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  counts() {
    return this.events.countByStatus();
  }

  @Patch('bulk-status')
  async bulkStatus(
    @Body() body: { ids?: unknown; status?: EventStatus; changeReason?: string | null },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    if (body.status === undefined || !EVENT_STATUSES.has(body.status)) {
      throw new BadRequestException(`Invalid status: ${String(body.status)}`);
    }
    const ids = parseBulkEventIds(body.ids);
    const changeReason = body.changeReason?.trim() || 'admin.bulk_status';
    const result = await this.events.updateStatusMany(ids, body.status, changeReason);
    this.audit.record({
      action: 'event.bulk_status',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'event',
      metadata: { status: body.status, changeReason, count: result.updated, ids: result.ids },
    });
    return result;
  }

  @Post('bulk-delete')
  @Roles(AdminRole.admin)
  async bulkDelete(@Body() body: { ids?: unknown }, @CurrentAdmin() admin: AdminJwtPayload) {
    const ids = parseBulkEventIds(body.ids);
    const result = await this.events.deleteMany(ids);
    this.audit.record({
      action: 'event.bulk_delete',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'event',
      metadata: { count: result.deleted, ids: result.ids },
    });
    return result;
  }

  @Get(':id')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  async get(@Param('id') id: string) {
    const event = await this.events.findById(id);
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    return event;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      slug?: string;
      summary?: string | null;
      description?: string | null;
      startAt?: string;
      endAt?: string | null;
      allDay?: boolean;
      status?: EventStatus;
      venue?: VenuePatchBody | null;
      categoryIds?: string[];
      changeReason?: string | null;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const existing = await this.events.findById(id);
    if (!existing) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    if (body.status !== undefined && !EVENT_STATUSES.has(body.status)) {
      throw new BadRequestException(`Invalid status: ${body.status}`);
    }

    if (body.slug !== undefined) {
      const slug = body.slug.trim();
      if (!slug) {
        throw new BadRequestException('Slug must not be empty');
      }
      const clash = await this.events.findBySlug(slug);
      if (clash && clash.id !== id) {
        throw new ConflictException(`Slug already in use: ${slug}`);
      }
    }

    let categoryIds: string[] | undefined;
    if (body.categoryIds !== undefined) {
      if (!Array.isArray(body.categoryIds)) {
        throw new BadRequestException('categoryIds must be an array');
      }
      categoryIds = [...new Set(body.categoryIds.map((cid) => String(cid).trim()).filter(Boolean))];
      for (const categoryId of categoryIds) {
        const category = await this.categories.findById(categoryId);
        if (!category) {
          throw new BadRequestException(`Category ${categoryId} not found`);
        }
      }
    }

    const startAt =
      body.startAt !== undefined ? parseOptionalDate(body.startAt, 'startAt') : undefined;
    const endAt = body.endAt !== undefined ? parseOptionalDate(body.endAt, 'endAt') : undefined;
    if (startAt === null) {
      throw new BadRequestException('startAt is required');
    }

    let venueId: string | null | undefined;
    if (body.venue !== undefined) {
      venueId = await this.resolveVenueId(body.venue);
    }

    try {
      const event = await this.events.updateWithVersion(id, {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.slug !== undefined ? { slug: body.slug.trim() } : {}),
        ...(body.summary !== undefined ? { summary: body.summary } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(startAt !== undefined ? { startAt } : {}),
        ...(endAt !== undefined ? { endAt } : {}),
        ...(body.allDay !== undefined ? { allDay: Boolean(body.allDay) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(venueId !== undefined ? { venueId } : {}),
        ...(categoryIds !== undefined ? { categoryIds } : {}),
        changeReason: body.changeReason?.trim() || 'admin.update',
      });
      this.audit.record({
        action: 'event.update',
        actorId: admin.sub,
        actorRole: admin.role,
        resourceType: 'event',
        resourceId: event.id,
        metadata: {
          status: event.status,
          ...(body.changeReason ? { changeReason: body.changeReason } : {}),
          ...(venueId !== undefined ? { venueId } : {}),
          ...(categoryIds !== undefined ? { categoryIds } : {}),
        },
      });
      if (venueId) {
        await this.geocoding.enqueueVenue(venueId);
      }
      return event;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Slug already in use');
      }
      throw err;
    }
  }

  private async resolveVenueId(venue: VenuePatchBody | null): Promise<string | null> {
    if (venue === null) {
      return null;
    }

    const rawName = typeof venue.name === 'string' ? venue.name.trim().replace(/\s+/g, ' ') : '';
    const city =
      venue.city === undefined ? undefined : venue.city === null ? null : venue.city.trim() || null;
    const rawAddress =
      venue.address === undefined
        ? undefined
        : venue.address === null
          ? null
          : venue.address.trim() || null;
    const regionId =
      venue.regionId === undefined
        ? undefined
        : venue.regionId === null
          ? null
          : venue.regionId.trim() || null;

    let settlementHint: string | null = null;
    if (regionId) {
      const region = await this.regions.findById(regionId);
      settlementHint = region?.name ?? null;
    }

    const name = rawName ? buildingLocalityFromLabel(rawName, settlementHint) || rawName : '';
    const address =
      rawAddress === undefined
        ? undefined
        : rawAddress === null
          ? null
          : streetLineFromAddress(rawAddress);

    if (venue.id) {
      const existing = await this.venues.findById(venue.id);
      if (!existing) {
        throw new BadRequestException(`Venue ${venue.id} not found`);
      }
      if (
        (name && name !== existing.name) ||
        (city !== undefined && city !== existing.city) ||
        (address !== undefined && address !== existing.address) ||
        (regionId !== undefined && regionId !== existing.regionId)
      ) {
        await this.venues.update(existing.id, {
          ...(name ? { name } : {}),
          ...(city !== undefined ? { city } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(regionId !== undefined ? { regionId } : {}),
        });
      }
      return existing.id;
    }

    if (!name) {
      return null;
    }

    const resolved = await this.venues.findOrCreate({
      name,
      ...(city !== undefined ? { city } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(regionId !== undefined ? { regionId } : {}),
    });
    return resolved.id;
  }

  @Delete(':id')
  @Roles(AdminRole.admin)
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminJwtPayload) {
    const existing = await this.events.findById(id);
    if (!existing) {
      throw new NotFoundException(`Event ${id} not found`);
    }
    const event = await this.events.delete(id);
    this.audit.record({
      action: 'event.delete',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'event',
      resourceId: event.id,
    });
    return event;
  }
}
