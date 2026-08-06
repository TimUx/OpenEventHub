import type { ApiEvent } from './api';

export type EventSortField = 'startAt' | 'title';
export type EventSortDir = 'asc' | 'desc';

export type EventListFilterState = {
  readonly category: string;
  readonly regionId: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly sortBy: EventSortField;
  readonly sortDir: EventSortDir;
};

export const DEFAULT_EVENT_LIST_FILTERS: EventListFilterState = {
  category: '',
  regionId: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'startAt',
  sortDir: 'asc',
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function filterListEvents(
  events: readonly ApiEvent[],
  {
    category = '',
    regionId = '',
    dateFrom = '',
    dateTo = '',
  }: Pick<EventListFilterState, 'category' | 'regionId' | 'dateFrom' | 'dateTo'>,
): ApiEvent[] {
  return events.filter((event) => {
    const day = dayKey(event.startAt);

    if (dateFrom && day < dateFrom) {
      return false;
    }
    if (dateTo && day > dateTo) {
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

    if (regionId && event.venue?.regionId !== regionId) {
      return false;
    }

    return true;
  });
}

export function sortListEvents(
  events: readonly ApiEvent[],
  sortBy: EventSortField,
  sortDir: EventSortDir,
): ApiEvent[] {
  const factor = sortDir === 'asc' ? 1 : -1;
  return [...events].sort((left, right) => {
    if (sortBy === 'title') {
      return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' }) * factor;
    }
    const delta = left.startAt.localeCompare(right.startAt);
    return delta * factor;
  });
}

export function applyEventListFilters(
  events: readonly ApiEvent[],
  filters: EventListFilterState,
): ApiEvent[] {
  const filtered = filterListEvents(events, filters);
  return sortListEvents(filtered, filters.sortBy, filters.sortDir);
}

export function eventListFiltersActive(
  filters: Pick<EventListFilterState, 'category' | 'regionId' | 'dateFrom' | 'dateTo'>,
): boolean {
  return Boolean(filters.category || filters.regionId || filters.dateFrom || filters.dateTo);
}
