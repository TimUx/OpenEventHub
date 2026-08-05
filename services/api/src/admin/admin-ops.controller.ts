import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, CrawlJobRepository } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminQueuesService } from './admin-queues.service.js';
import { AdminSchedulerService } from './admin-scheduler.service.js';

@ApiTags('admin-crawler')
@ApiBearerAuth()
@Controller('api/v1/admin/crawler')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminCrawlerController {
  constructor(private readonly crawlJobs: CrawlJobRepository) {}

  @Get('jobs')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  listJobs(@Query('limit') limit?: string) {
    return this.crawlJobs.listRecent(limit ? Number(limit) : 50);
  }
}

@ApiTags('admin-scheduler')
@ApiBearerAuth()
@Controller('api/v1/admin/scheduler')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminSchedulerController {
  constructor(
    private readonly scheduler: AdminSchedulerService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list() {
    return this.scheduler.listRepeatable();
  }

  @Post('reload')
  async reload(@CurrentAdmin() admin: AdminJwtPayload) {
    const result = await this.scheduler.reloadFromSources();
    this.audit.record({
      action: 'scheduler.reload',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'scheduler',
      metadata: result,
    });
    return result;
  }
}

@ApiTags('admin-queues')
@ApiBearerAuth()
@Controller('api/v1/admin/queues')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
export class AdminQueuesController {
  constructor(private readonly queues: AdminQueuesService) {}

  @Get()
  list() {
    return this.queues.listCounts();
  }
}
