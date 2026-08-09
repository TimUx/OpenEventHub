/**
 * BullMQ geocoding job payload.
 * See docs/GEOCODING.md and docs/QUEUE_AND_WORKERS.md.
 */
export type GeocodingJobPayload = {
  /** Geocode and persist latitude/longitude on this venue. */
  readonly venueId?: string;
  /** Geocode and persist latitude/longitude on this region. */
  readonly regionId?: string;
};

export function geocodingJobId(payload: GeocodingJobPayload): string {
  if (payload.venueId) {
    return `venue-${payload.venueId}`;
  }
  if (payload.regionId) {
    return `region-${payload.regionId}`;
  }
  return `geocode-${Date.now()}`;
}
