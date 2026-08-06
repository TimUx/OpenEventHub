import { Injectable } from '@nestjs/common';
import { CrawlJobRepository, SourceRepository } from '@openeventhub/database';

import { AdminQueuesService, type FailedQueueJob } from './admin-queues.service.js';

export type ErrorLogKind = 'queue' | 'crawl' | 'source';

export type ErrorLogEntry = {
  readonly id: string;
  readonly kind: ErrorLogKind;
  /** Queue name, source name, or crawl source name. */
  readonly subject: string;
  readonly reason: string;
  readonly detail: string | null;
  readonly occurredAt: string | null;
};

@Injectable()
export class AdminLogsService {
  constructor(
    private readonly queues: AdminQueuesService,
    private readonly crawlJobs: CrawlJobRepository,
    private readonly sources: SourceRepository,
  ) {}

  /**
   * Unified error log: BullMQ failures, failed crawl jobs, and source lastError.
   * Sorted newest first.
   */
  async listErrors(limit = 100): Promise<ErrorLogEntry[]> {
    const take = Math.min(Math.max(limit, 1), 200);
    const perSource = Math.min(50, take);

    const [failedQueueJobs, failedCrawlJobs, sources] = await Promise.all([
      this.queues.listFailedJobs(perSource),
      this.crawlJobs.listFailedRecent(perSource),
      this.sources.list(),
    ]);

    const entries: ErrorLogEntry[] = [
      ...failedQueueJobs.map((job) => mapQueueFailure(job)),
      ...failedCrawlJobs.map((job) => ({
        id: `crawl:${job.id}`,
        kind: 'crawl' as const,
        subject: job.source.name,
        reason: (job.errorMessage ?? '').trim() || 'Crawl failed (no message)',
        detail: `crawlJobId=${job.id}`,
        occurredAt: job.createdAt.toISOString(),
      })),
      ...sources
        .filter((source) => Boolean(source.lastError?.trim()))
        .map((source) => ({
          id: `source:${source.id}`,
          kind: 'source' as const,
          subject: source.name,
          reason: (source.lastError as string).trim(),
          detail: `sourceId=${source.id}`,
          occurredAt: source.updatedAt?.toISOString?.() ?? null,
        })),
    ];

    entries.sort((a, b) => {
      const aTs = a.occurredAt ?? '';
      const bTs = b.occurredAt ?? '';
      return bTs.localeCompare(aTs);
    });

    return entries.slice(0, take);
  }
}

function mapQueueFailure(job: FailedQueueJob): ErrorLogEntry {
  return {
    id: `queue:${job.queue}:${job.id}`,
    kind: 'queue',
    subject: job.queue,
    reason: job.failedReason,
    detail: [
      job.name,
      job.payloadSummary,
      job.attemptsMade > 0 ? `attempts=${job.attemptsMade}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    occurredAt: job.finishedOn ?? job.timestamp,
  };
}
