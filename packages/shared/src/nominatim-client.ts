import type { NominatimSearchHit } from './nominatim-region-hierarchy.js';

/**
 * OpenStreetMap Nominatim search client (Germany-focused).
 * Respect usage policy: meaningful User-Agent, ≤1 request/second.
 */
export class NominatimClient {
  constructor(
    private readonly baseUrl = process.env.NOMINATIM_BASE_URL?.replace(/\/$/, '') ||
      'https://nominatim.openstreetmap.org',
    private readonly userAgent = process.env.NOMINATIM_USER_AGENT ||
      'OpenEventHub/0.24 (geocoding; https://github.com/TimUx/OpenEventHub)',
  ) {}

  async searchGermany(query: string, limit = 8): Promise<NominatimSearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('countrycodes', 'de');
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 15)));
    url.searchParams.set('accept-language', 'de');

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': this.userAgent,
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const err = new Error(`Nominatim search failed with ${response.status}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as NominatimSearchHit[]) : [];
  }
}

export function parseNominatimCoordinates(
  hit: NominatimSearchHit | null | undefined,
): { latitude: number; longitude: number } | null {
  if (!hit?.lat || !hit?.lon) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
