import { Body, Controller, Get, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, CoverageScopeRepository, RegionRepository } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('admin-coverage-scope')
@ApiBearerAuth()
@Controller('api/v1/admin/coverage-scope')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminCoverageScopeController {
  constructor(
    private readonly coverage: CoverageScopeRepository,
    private readonly regions: RegionRepository,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @Roles(AdminRole.admin, AdminRole.moderator, AdminRole.viewer)
  async get() {
    const regions = await this.coverage.listRegions();
    return {
      regionIds: regions.map((row) => row.id),
      regions,
    };
  }

  @Put()
  async put(@Body() body: { regionIds?: string[] }, @CurrentAdmin() admin: AdminJwtPayload) {
    const regionIds = Array.isArray(body.regionIds) ? body.regionIds : [];
    for (const id of regionIds) {
      const region = await this.regions.findById(id);
      if (!region) {
        throw new BadRequestException(`Unknown regionId: ${id}`);
      }
    }
    const saved = await this.coverage.setRegionIds(regionIds);
    const regions = await this.coverage.listRegions();
    this.audit.record({
      action: 'coverage_scope.update',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'coverage_scope',
      resourceId: 'singleton',
      metadata: { regionIds: saved },
    });
    return { regionIds: saved, regions };
  }
}
