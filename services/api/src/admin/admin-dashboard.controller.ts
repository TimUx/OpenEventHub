import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminRole,
  AdminUserRepository,
  AiSettingsRepository,
  CategoryRepository,
  CrawlJobRepository,
  EventRepository,
  ModerationRepository,
  RegionRepository,
  SourceRepository,
  SubmissionRepository,
} from '@openeventhub/database';

import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminQueuesService } from './admin-queues.service.js';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('api/v1/admin')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
export class AdminDashboardController {
  constructor(
    private readonly sources: SourceRepository,
    private readonly crawlJobs: CrawlJobRepository,
    private readonly moderation: ModerationRepository,
    private readonly events: EventRepository,
    private readonly submissions: SubmissionRepository,
    private readonly users: AdminUserRepository,
    private readonly ai: AiSettingsRepository,
    private readonly categories: CategoryRepository,
    private readonly regions: RegionRepository,
    private readonly queues: AdminQueuesService,
  ) {}

  @Get('dashboard')
  async dashboard() {
    const [
      sourceStatus,
      crawlStatus,
      moderationStatus,
      eventStatus,
      queueCounts,
      recentJobs,
      recentSubmissions,
      userCount,
      activeAi,
      categories,
      regions,
    ] = await Promise.all([
      this.sources.countByStatus(),
      this.crawlJobs.countByStatus(),
      this.moderation.countByStatus(),
      this.events.countByStatus(),
      this.queues.listCounts(),
      this.crawlJobs.listRecent(8),
      this.submissions.listRecent(8),
      this.users.count(),
      this.ai.getRuntimeSettings(),
      this.categories.list(),
      this.regions.list(),
    ]);

    const failedQueues = queueCounts.filter((q) => q.counts.failed > 0);
    return {
      system: {
        users: userCount,
        categories: categories.length,
        regions: regions.length,
        activeAiProvider: activeAi.activeProviderProfile
          ? {
              id: activeAi.activeProviderProfile.id,
              name: activeAi.activeProviderProfile.name,
              type: activeAi.activeProviderProfile.type,
              enabled: activeAi.activeProviderProfile.enabled,
            }
          : null,
      },
      sources: sourceStatus,
      crawls: crawlStatus,
      moderation: moderationStatus,
      events: eventStatus,
      queues: queueCounts,
      recentImports: recentJobs,
      recentSubmissions,
      errors: {
        sourcesWithErrors: (await this.sources.list()).filter((s) => Boolean(s.lastError)).length,
        failedQueues: failedQueues.map((q) => ({ name: q.name, failed: q.counts.failed })),
      },
    };
  }

  @Get('events')
  listEvents(@Query('limit') limit?: string) {
    return this.events.listAll({ limit: limit ? Number(limit) : 50 });
  }

  @Get('categories')
  listCategories() {
    return this.categories.list();
  }

  @Get('regions')
  listRegions() {
    return this.regions.list();
  }
}
