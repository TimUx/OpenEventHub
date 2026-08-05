import { Injectable, NotFoundException } from '@nestjs/common';
import { EventRepository } from '@openeventhub/database';

import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly events: EventRepository,
    private readonly audit: AuditService,
  ) {}

  list(limit?: number, offset?: number) {
    return this.events.listPublished({
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
  }

  async getById(id: string) {
    const event = await this.events.findPublishedById(id);
    if (!event) {
      throw new NotFoundException(`Event '${id}' not found`);
    }
    this.audit.record({
      action: 'events.read',
      resourceType: 'event',
      resourceId: id,
    });
    return event;
  }
}
