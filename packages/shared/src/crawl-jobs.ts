/**
 * BullMQ job payload contracts for the crawler/discovery pipeline.
 * Keep these types serializable (JSON) because BullMQ stores job data in Redis.
 */

export interface CrawlJobPayload {
  /**
   * Single-source crawl (manual “crawl now”, or legacy per-source repeatables).
   * Mutually exclusive with `scheduleCron` for new jobs.
   */
  readonly sourceId?: string;
  /**
   * Scheduled tick for a cron pattern: the crawler loads all enabled sources with
   * this `scheduleCron` and processes them **serially** (one after another).
   */
  readonly scheduleCron?: string;
}

/** Collect distinct cron patterns for enabled, scheduled sources. */
export function uniqueEnabledScheduleCrons(
  sources: ReadonlyArray<{ readonly scheduleCron: string | null; readonly status: string }>,
): string[] {
  const patterns = new Set<string>();
  for (const source of sources) {
    if (source.status === 'disabled') {
      continue;
    }
    const cron = source.scheduleCron?.trim();
    if (cron) {
      patterns.add(cron);
    }
  }
  return [...patterns].sort();
}

/** Stable BullMQ repeatable jobId for a schedule-tick (one job per cron pattern). */
export function crawlScheduleRepeatableJobId(scheduleCron: string): string {
  return `schedule:${scheduleCron.replace(/[^a-zA-Z0-9*_/\-,.]+/g, '_')}`;
}
