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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, EventRepository, EventStatus } from '@openeventhub/database';
import { Prisma } from '@prisma/client';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

const EVENT_STATUSES = new Set<string>(Object.values(EventStatus));

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
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list(@Query('limit') limit?: string) {
    return this.events.listAll({ limit: limit ? Number(limit) : 100 });
  }

  @Get('counts')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  counts() {
    return this.events.countByStatus();
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

    const startAt =
      body.startAt !== undefined ? parseOptionalDate(body.startAt, 'startAt') : undefined;
    const endAt = body.endAt !== undefined ? parseOptionalDate(body.endAt, 'endAt') : undefined;
    if (startAt === null) {
      throw new BadRequestException('startAt is required');
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
        },
      });
      return event;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Slug already in use');
      }
      throw err;
    }
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
