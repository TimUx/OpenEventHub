import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole, RegionRepository, VenueRepository } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';
import { AdminJwtAuthGuard, type AdminJwtPayload } from '../auth/admin-jwt.guard.js';
import { CurrentAdmin } from '../auth/current-admin.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { GeocodingEnqueueService } from '../geocoding/geocoding-enqueue.service.js';

@ApiTags('admin-geocoding')
@ApiBearerAuth()
@Controller('api/v1/admin/geocoding')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.admin, AdminRole.moderator)
export class AdminGeocodingController {
  constructor(
    private readonly venues: VenueRepository,
    private readonly regions: RegionRepository,
    private readonly geocoding: GeocodingEnqueueService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Enqueue Nominatim geocoding for venues/regions missing coordinates.
   */
  @Post('backfill')
  async backfill(
    @Body() body: { limit?: number; venues?: boolean; regions?: boolean },
    @CurrentAdmin() admin: AdminJwtPayload,
  ) {
    const limit = body.limit ? Number(body.limit) : 200;
    const doVenues = body.venues !== false;
    const doRegions = body.regions !== false;

    let venueJobs = 0;
    let regionJobs = 0;

    if (doVenues) {
      const missing = await this.venues.listMissingCoordinates(limit);
      for (const venue of missing) {
        await this.geocoding.enqueueVenue(venue.id);
        venueJobs += 1;
      }
    }

    if (doRegions) {
      const missing = await this.regions.listMissingCoordinates(limit);
      for (const region of missing) {
        await this.geocoding.enqueueRegion(region.id);
        regionJobs += 1;
      }
    }

    this.audit.record({
      action: 'geocoding.backfill',
      actorId: admin.sub,
      actorRole: admin.role,
      resourceType: 'geocoding',
      resourceId: 'backfill',
      metadata: { venueJobs, regionJobs, limit },
    });

    return { venueJobs, regionJobs, limit };
  }
}
