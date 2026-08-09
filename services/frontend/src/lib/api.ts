export type ApiEventVenue = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly regionId: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
};

export type ApiEventCategory = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export type ApiEventMedia = {
  readonly id: string;
  readonly type: string;
  readonly url: string | null;
  readonly altText: string | null;
  readonly sortOrder: number;
};

export type ApiEvent = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly allDay?: boolean;
  readonly status: string;
  readonly venueId?: string | null;
  readonly organizerId?: string | null;
  readonly venue?: ApiEventVenue | null;
  readonly categories?: readonly ApiEventCategory[];
  readonly media?: readonly ApiEventMedia[];
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
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://api.localhost:8088';
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
  const method = init?.method?.toUpperCase() ?? 'GET';
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
    ...(method === 'GET' ? { next: { revalidate: 30 } } : { cache: 'no-store' as const }),
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
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

export type SubmissionResponse = {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly moderationId: string;
  readonly createdAt: string;
};

export function submitEvent(input: {
  readonly payload: Record<string, unknown>;
  readonly submitterEmail?: string;
}): Promise<SubmissionResponse> {
  return apiFetch<SubmissionResponse>('/api/v1/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function submitSource(input: {
  readonly payload: Record<string, unknown>;
  readonly submitterEmail?: string;
}): Promise<SubmissionResponse> {
  return apiFetch<SubmissionResponse>('/api/v1/source-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function listCategories(): Promise<ApiCategory[]> {
  return apiFetch<ApiCategory[]>('/api/v1/categories');
}

export function listRegions(): Promise<ApiRegion[]> {
  return apiFetch<ApiRegion[]>('/api/v1/regions');
}

export function formatEventDate(
  iso: string,
  locale: 'de' | 'en' = 'de',
  options?: { allDay?: boolean },
): string {
  const tag = locale === 'de' ? 'de-DE' : 'en-GB';
  if (options?.allDay) {
    return new Intl.DateTimeFormat(tag, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(iso));
  }
  return new Intl.DateTimeFormat(tag, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(iso));
}
