import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  CrawlJobRepository,
  SourceRepository,
  SourceStatus,
  type Prisma,
} from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminSchedulerService } from './admin-scheduler.service.js';

@ApiTags('admin-sources')
@ApiBearerAuth()
@Controller('api/v1/admin/sources')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminSourcesController {
  constructor(
    private readonly sources: SourceRepository,
    private readonly crawlJobs: CrawlJobRepository,
    private readonly scheduler: AdminSchedulerService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list() {
    return this.sources.list();
  }

  @Get(':id')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  async get(@Param('id') id: string) {
    const source = await this.sources.findById(id);
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }
    return source;
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      pluginType: string;
      url: string;
      scheduleCron?: string | null;
      config?: Record<string, unknown>;
      status?: SourceStatus;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const source = await this.sources.create({
      name: body.name,
      pluginType: body.pluginType,
      url: body.url,
      scheduleCron: body.scheduleCron ?? null,
      config: (body.config ?? {}) as Prisma.InputJsonValue,
      status: body.status ?? SourceStatus.healthy,
    });
    if (source.scheduleCron) {
      await this.scheduler.reloadFromSources();
    }
    this.audit.record({
      action: 'source.create',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'source',
      resourceId: source.id,
    });
    return source;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      pluginType?: string;
      url?: string;
      scheduleCron?: string | null;
      config?: Record<string, unknown>;
      status?: SourceStatus;
    },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const existing = await this.sources.findById(id);
    if (!existing) {
      throw new NotFoundException(`Source ${id} not found`);
    }
    const source = await this.sources.update(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.pluginType !== undefined ? { pluginType: body.pluginType } : {}),
      ...(body.url !== undefined ? { url: body.url } : {}),
      ...(body.scheduleCron !== undefined ? { scheduleCron: body.scheduleCron } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.config !== undefined ? { config: body.config as Prisma.InputJsonValue } : {}),
    });
    await this.scheduler.reloadFromSources();
    this.audit.record({
      action: 'source.update',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'source',
      resourceId: source.id,
    });
    return source;
  }

  @Delete(':id')
  @Roles(AdminRole.admin)
  async remove(@Param('id') id: string, @CurrentAdmin() admin: AdminJwtPayload) {
    const existing = await this.sources.findById(id);
    if (!existing) {
      throw new NotFoundException(`Source ${id} not found`);
    }
    const source = await this.sources.delete(id);
    await this.scheduler.reloadFromSources();
    this.audit.record({
      action: 'source.delete',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'source',
      resourceId: source.id,
    });
    return source;
  }

  @Post(':id/crawl')
  async triggerCrawl(@Param('id') id: string, @CurrentAdmin() admin: AdminJwtPayload) {
    const source = await this.sources.findById(id);
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }
    const crawlJob = await this.crawlJobs.createQueued(source.id);
    const enqueued = await this.scheduler.enqueueCrawl(source.id);
    this.audit.record({
      action: 'source.crawl',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'source',
      resourceId: source.id,
      metadata: { crawlJobId: crawlJob.id, bullJobId: enqueued.jobId },
    });
    return { crawlJob, queueJobId: enqueued.jobId };
  }
}
