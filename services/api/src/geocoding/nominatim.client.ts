import type { NominatimSearchHit } from '@openeventhub/shared';

export class NominatimClient {
  constructor(
    private readonly baseUrl = process.env.NOMINATIM_BASE_URL?.replace(/\/$/, '') ||
      'https://nominatim.openstreetmap.org',
    private readonly userAgent = process.env.NOMINATIM_USER_AGENT ||
      'OpenEventHub/0.22 (admin-region-lookup; https://github.com/TimUx/OpenEventHub)',
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
      throw new Error(`Nominatim search failed with ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as NominatimSearchHit[]) : [];
  }
}
