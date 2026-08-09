import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES, type GeocodingJobPayload } from '@openeventhub/shared';
import type { Job } from 'bullmq';

import { GeocodingService } from './geocoding.service.js';

@Processor(QUEUE_NAMES.geocoding, {
  concurrency: 1,
  limiter: { max: 1, duration: 1500 },
})
export class GeocodingQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(GeocodingQueueProcessor.name);

  constructor(private readonly geocoding: GeocodingService) {
    super();
  }

  async process(job: Job<GeocodingJobPayload>): Promise<unknown> {
    const { venueId, regionId } = job.data;
    this.logger.log(
      `Geocoding job=${job.id} venue=${venueId ?? 'n/a'} region=${regionId ?? 'n/a'}`,
    );

    if (venueId) {
      const result = await this.geocoding.geocodeVenue(venueId);
      if (!result.ok && result.reason === 'no_hit') {
        // Soft-fail: don't retry forever for unknown places.
        return result;
      }
      if (
        !result.ok &&
        result.reason !== 'already_geocoded' &&
        result.reason !== 'venue_not_found'
      ) {
        throw new Error(`Venue geocode failed: ${result.reason ?? 'unknown'}`);
      }
      return result;
    }

    if (regionId) {
      const result = await this.geocoding.geocodeRegion(regionId);
      if (!result.ok && result.reason === 'no_hit') {
        return result;
      }
      if (
        !result.ok &&
        result.reason !== 'already_geocoded' &&
        result.reason !== 'region_not_found'
      ) {
        throw new Error(`Region geocode failed: ${result.reason ?? 'unknown'}`);
      }
      return result;
    }

    return { ok: false, reason: 'empty_payload' };
  }
}
