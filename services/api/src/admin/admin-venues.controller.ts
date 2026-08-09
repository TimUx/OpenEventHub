import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, VenueRepository } from '@openeventhub/database';

import { AdminJwtAuthGuard } from '../auth/admin-jwt.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-venues')
@ApiBearerAuth()
@Controller('api/v1/admin/venues')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
export class AdminVenuesController {
  constructor(private readonly venues: VenueRepository) {}

  @Get()
  list(@Query('q') q?: string, @Query('limit') limit?: string) {
    return this.venues.list({
      ...(q?.trim() ? { q: q.trim() } : {}),
      limit: limit ? Number(limit) : 50,
    });
  }
}
