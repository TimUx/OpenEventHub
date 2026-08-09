import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { geocodingJobId, QUEUE_NAMES, type GeocodingJobPayload } from '@openeventhub/shared';
import type { Queue } from 'bullmq';

@Injectable()
export class GeocodingEnqueueService {
  private readonly logger = new Logger(GeocodingEnqueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.geocoding)
    private readonly geocoding: Queue<GeocodingJobPayload>,
  ) {}

  async enqueueVenue(venueId: string | null | undefined): Promise<void> {
    if (!venueId) return;
    await this.enqueue({ venueId });
  }

  async enqueueRegion(regionId: string | null | undefined): Promise<void> {
    if (!regionId) return;
    await this.enqueue({ regionId });
  }

  async enqueue(payload: GeocodingJobPayload): Promise<void> {
    if (!payload.venueId && !payload.regionId) return;
    const jobId = geocodingJobId(payload);
    try {
      await this.geocoding.add('geocode', payload, {
        jobId,
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 4,
        backoff: { type: 'exponential', delay: 5_000 },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/already exists|Job with this id/i.test(message)) {
        try {
          const existing = await this.geocoding.getJob(jobId);
          if (existing) {
            const state = await existing.getState();
            if (state === 'completed' || state === 'failed') {
              await existing.remove();
              await this.geocoding.add('geocode', payload, {
                jobId,
                removeOnComplete: 200,
                removeOnFail: 100,
                attempts: 4,
                backoff: { type: 'exponential', delay: 5_000 },
              });
            }
          }
        } catch (retryErr) {
          const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
          this.logger.warn(`Failed to re-enqueue geocoding ${jobId}: ${retryMessage}`);
        }
        return;
      }
      this.logger.warn(`Failed to enqueue geocoding ${jobId}: ${message}`);
    }
  }
}
