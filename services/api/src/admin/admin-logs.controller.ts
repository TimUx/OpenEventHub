import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@openeventhub/database';

import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminLogsService } from './admin-logs.service.js';

@ApiTags('admin-logs')
@ApiBearerAuth()
@Controller('api/v1/admin/logs')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
export class AdminLogsController {
  constructor(private readonly logs: AdminLogsService) {}

  @Get('errors')
  listErrors(@Query('limit') limit?: string) {
    return this.logs.listErrors(limit ? Number(limit) : 100);
  }
}
