import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { EventRepository } from '@openeventhub/database';

const SERVICE_NAME = 'scheduler';
/** Hourly cleanup of events past their effective end. */
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class EventCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(`${SERVICE_NAME}:event-cleanup`);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly events: EventRepository) {}

  async onModuleInit(): Promise<void> {
    await this.runCleanup();
    this.timer = setInterval(() => {
      void this.runCleanup();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runCleanup(): Promise<number> {
    try {
      const deleted = await this.events.deleteExpired(new Date());
      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} expired event(s)`);
      } else {
        this.logger.debug('Expired event cleanup: nothing to delete');
      }
      return deleted;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Expired event cleanup failed: ${message}`);
      return 0;
    }
  }
}
