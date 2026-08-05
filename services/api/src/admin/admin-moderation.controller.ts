import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, ModerationRepository, ModerationStatus } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-moderation')
@ApiBearerAuth()
@Controller('api/v1/admin/moderation')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminModerationController {
  constructor(
    private readonly moderation: ModerationRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  list(@Query('status') status?: ModerationStatus, @Query('limit') limit?: string) {
    return this.moderation.list(status, limit ? Number(limit) : 100);
  }

  @Get(':id')
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  async get(@Param('id') id: string) {
    const item = await this.moderation.findById(id);
    if (!item) {
      throw new NotFoundException(`Moderation item ${id} not found`);
    }
    return item;
  }

  @Post(':id/decide')
  async decide(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' | 'escalated'; notes?: string | null },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const existing = await this.moderation.findById(id);
    if (!existing) {
      throw new NotFoundException(`Moderation item ${id} not found`);
    }
    const item = await this.moderation.decide(id, {
      status: body.status,
      reviewedBy: admin.email,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    });
    this.audit.record({
      action: `moderation.${body.status}`,
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'moderation_item',
      resourceId: item.id,
      metadata: { notes: body.notes ?? null },
    });
    return item;
  }
}
