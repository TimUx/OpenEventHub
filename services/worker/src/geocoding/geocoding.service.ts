import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@openeventhub/database';
import {
  NominatimClient,
  parseNominatimCoordinates,
  type NominatimSearchHit,
} from '@openeventhub/shared';

export type GeocodeResult = {
  readonly ok: boolean;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly query?: string;
  readonly reason?: string;
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatim = new NominatimClient();

  constructor(private readonly prisma: PrismaClient) {}

  async geocodeVenue(venueId: string): Promise<GeocodeResult> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      include: { region: true },
    });
    if (!venue) {
      return { ok: false, reason: 'venue_not_found' };
    }
    if (venue.latitude != null && venue.longitude != null) {
      return {
        ok: true,
        latitude: Number(venue.latitude),
        longitude: Number(venue.longitude),
        reason: 'already_geocoded',
      };
    }

    const queries = this.venueQueries(venue);
    const coords = await this.searchFirst(queries);
    if (!coords) {
      this.logger.warn(`No geocode hit for venue=${venueId} queries=${JSON.stringify(queries)}`);
      return { ok: false, ...(queries[0] ? { query: queries[0] } : {}), reason: 'no_hit' };
    }

    await this.prisma.venue.update({
      where: { id: venueId },
      data: { latitude: coords.latitude, longitude: coords.longitude },
    });

    if (venue.regionId) {
      const region = venue.region;
      if (region && (region.latitude == null || region.longitude == null)) {
        await this.prisma.region.update({
          where: { id: venue.regionId },
          data: { latitude: coords.latitude, longitude: coords.longitude },
        });
      }
    }

    this.logger.log(
      `Geocoded venue=${venueId} lat=${coords.latitude} lon=${coords.longitude} query=${JSON.stringify(coords.query)}`,
    );
    return {
      ok: true,
      latitude: coords.latitude,
      longitude: coords.longitude,
      query: coords.query,
    };
  }

  async geocodeRegion(regionId: string): Promise<GeocodeResult> {
    const region = await this.prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      return { ok: false, reason: 'region_not_found' };
    }
    if (region.latitude != null && region.longitude != null) {
      return {
        ok: true,
        latitude: Number(region.latitude),
        longitude: Number(region.longitude),
        reason: 'already_geocoded',
      };
    }

    const chain = await this.regionNameChain(regionId);
    const queries = [
      [...chain].reverse().join(', ') + ', Deutschland',
      region.name + ', Deutschland',
    ];
    const coords = await this.searchFirst(queries);
    if (!coords) {
      this.logger.warn(`No geocode hit for region=${regionId} queries=${JSON.stringify(queries)}`);
      return { ok: false, ...(queries[0] ? { query: queries[0] } : {}), reason: 'no_hit' };
    }

    await this.prisma.region.update({
      where: { id: regionId },
      data: { latitude: coords.latitude, longitude: coords.longitude },
    });

    this.logger.log(
      `Geocoded region=${regionId} lat=${coords.latitude} lon=${coords.longitude} query=${JSON.stringify(coords.query)}`,
    );
    return {
      ok: true,
      latitude: coords.latitude,
      longitude: coords.longitude,
      query: coords.query,
    };
  }

  private venueQueries(venue: {
    name: string;
    address: string | null;
    city: string | null;
    region: { name: string } | null;
  }): string[] {
    const unique = (parts: Array<string | null | undefined>): string =>
      [...new Set(parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p)))].join(', ');

    const queries: string[] = [];
    const full = unique([venue.address, venue.name, venue.city, venue.region?.name]);
    if (full) queries.push(`${full}, Deutschland`);
    const nameCity = unique([venue.name, venue.city]);
    if (nameCity && nameCity !== full) queries.push(`${nameCity}, Deutschland`);
    if (venue.name.trim()) queries.push(`${venue.name.trim()}, Deutschland`);
    return [...new Set(queries)];
  }

  private async regionNameChain(regionId: string): Promise<string[]> {
    const names: string[] = [];
    let currentId: string | null = regionId;
    let guard = 0;
    while (currentId && guard < 12) {
      guard += 1;
      const row: { name: string; parentId: string | null } | null =
        await this.prisma.region.findUnique({
          where: { id: currentId },
          select: { name: true, parentId: true },
        });
      if (!row) break;
      names.push(row.name);
      currentId = row.parentId;
    }
    return names;
  }

  private async searchFirst(
    queries: readonly string[],
  ): Promise<{ latitude: number; longitude: number; query: string } | null> {
    for (const query of queries) {
      let hits: NominatimSearchHit[];
      try {
        hits = await this.nominatim.searchGermany(query, 5);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const status = (err as Error & { status?: number }).status;
        this.logger.warn(`Nominatim failed for ${JSON.stringify(query)}: ${message}`);
        // Rate-limit / transient: let BullMQ retry the whole job.
        if (status === 429 || status === 503 || /fetch failed/i.test(message)) {
          throw err;
        }
        continue;
      }
      for (const hit of hits) {
        const coords = parseNominatimCoordinates(hit);
        if (coords) {
          return { ...coords, query };
        }
      }
    }
    return null;
  }
}
