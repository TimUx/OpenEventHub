import { BadRequestException } from '@nestjs/common';

/** Matches `EventRepository.listAll` max page size used by Admin Events. */
export const MAX_ADMIN_EVENT_BULK = 200;

export function parseBulkEventIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    throw new BadRequestException('ids must be an array');
  }
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  if (unique.length === 0) {
    throw new BadRequestException('ids must not be empty');
  }
  if (unique.length > MAX_ADMIN_EVENT_BULK) {
    throw new BadRequestException(`ids must contain at most ${MAX_ADMIN_EVENT_BULK} items`);
  }
  return unique;
}
