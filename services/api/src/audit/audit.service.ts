import { Injectable, Logger } from '@nestjs/common';

export type AuditEvent = {
  readonly action: string;
  readonly actorId?: string;
  readonly actorRole?: string;
  readonly resourceType?: string;
  readonly resourceId?: string;
  readonly metadata?: Record<string, unknown>;
};

/**
 * Audit log hook. M6 persists via structured logs; a dedicated store can replace this later.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  record(event: AuditEvent): void {
    this.logger.log(
      JSON.stringify({
        audit: true,
        at: new Date().toISOString(),
        ...event,
      }),
    );
  }
}
