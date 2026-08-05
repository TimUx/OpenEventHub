export type ApiEvent = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly status: string;
  readonly venueId?: string | null;
  readonly organizerId?: string | null;
};

export type ApiCategory = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parentId: string | null;
};

export type ApiRegion = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  readonly parentId: string | null;
};

/** Browser-facing API base (Traefik host). */
export function getPublicApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
    'http://api.localhost:8088'
  );
}

/** Server-side API base (Docker DNS when available). */
export function getServerApiBase(): string {
  return (
    process.env.API_INTERNAL_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
    'http://api.localhost:8088'
  );
}

/** Public site origin for canonical URLs, sitemap, and JSON-LD. */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:8088').replace(/\/$/, '');
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = typeof window === 'undefined' ? getServerApiBase() : getPublicApiBase();
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function listEvents(limit = 50): Promise<ApiEvent[]> {
  return apiFetch<ApiEvent[]>(`/api/v1/events?limit=${limit}`);
}

export function getEvent(id: string): Promise<ApiEvent> {
  return apiFetch<ApiEvent>(`/api/v1/events/${encodeURIComponent(id)}`);
}

export function searchEvents(q: string, limit = 50): Promise<ApiEvent[]> {
  const query = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch<ApiEvent[]>(`/api/v1/search?${query.toString()}`);
}

export function listCategories(): Promise<ApiCategory[]> {
  return apiFetch<ApiCategory[]>('/api/v1/categories');
}

export function listRegions(): Promise<ApiRegion[]> {
  return apiFetch<ApiRegion[]>('/api/v1/regions');
}

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
}
