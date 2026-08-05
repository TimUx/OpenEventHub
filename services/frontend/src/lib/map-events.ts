import type { ApiEvent } from './api';

export type EventCoordinates = {
  readonly latitude: number;
  readonly longitude: number;
};

export function getEventCoordinates(event: ApiEvent): EventCoordinates | null {
  const latitude = event.venue?.latitude ?? null;
  const longitude = event.venue?.longitude ?? null;
  if (latitude == null || longitude == null) {
    return null;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

export function eventHasCoordinates(event: ApiEvent): boolean {
  return getEventCoordinates(event) !== null;
}

export function filterMapEvents(
  events: readonly ApiEvent[],
  {
    query = '',
    category = '',
    regionId = '',
    date = '',
  }: {
    readonly query?: string;
    readonly category?: string;
    readonly regionId?: string;
    readonly date?: string;
  },
): ApiEvent[] {
  const needle = query.trim().toLowerCase();

  return events.filter((event) => {
    if (date && event.startAt.slice(0, 10) !== date) {
      return false;
    }

    if (category) {
      const match = event.categories?.some(
        (item) => item.id === category || item.slug === category || item.name === category,
      );
      if (!match) {
        return false;
      }
    }

    if (regionId) {
      if (event.venue?.regionId !== regionId) {
        return false;
      }
    }

    if (!needle) {
      return true;
    }

    const haystack = [
      event.title,
      event.summary ?? '',
      event.description ?? '',
      event.venue?.name ?? '',
      event.venue?.city ?? '',
      ...(event.categories ?? []).map((item) => item.name),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
}
