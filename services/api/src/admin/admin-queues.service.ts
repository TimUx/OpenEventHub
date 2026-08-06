import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { metricsRegistry } from '@openeventhub/service-runtime';
import { QUEUE_NAMES } from '@openeventhub/shared';

type QueueCounts = {
  readonly waiting: number;
  readonly active: number;
  readonly completed: number;
  readonly failed: number;
  readonly delayed: number;
  readonly paused: number;
};

export type FailedQueueJob = {
  readonly queue: string;
  readonly id: string;
  readonly name: string;
  readonly failedReason: string;
  readonly attemptsMade: number;
  readonly timestamp: string | null;
  readonly finishedOn: string | null;
  readonly payloadSummary: string | null;
};

function summarizePayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of ['sourceId', 'crawlJobId', 'eventId', 'objectKey', 'jobId'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function mapFailedJob(queue: string, job: Job): FailedQueueJob {
  const reason = (job.failedReason ?? '').trim() || 'Unknown failure';
  return {
    queue,
    id: String(job.id ?? ''),
    name: job.name || 'job',
    failedReason: reason.slice(0, 2000),
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
    finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    payloadSummary: summarizePayload(job.data),
  };
}

@Injectable()
export class AdminQueuesService implements OnModuleInit, OnModuleDestroy {
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    @InjectQueue(QUEUE_NAMES.crawl) private readonly crawl: Queue,
    @InjectQueue(QUEUE_NAMES.ocr) private readonly ocr: Queue,
    @InjectQueue(QUEUE_NAMES.ai) private readonly ai: Queue,
    @InjectQueue(QUEUE_NAMES.discovery) private readonly discovery: Queue,
    @InjectQueue(QUEUE_NAMES.geocoding) private readonly geocoding: Queue,
    @InjectQueue(QUEUE_NAMES.searchIndex) private readonly searchIndex: Queue,
    @InjectQueue(QUEUE_NAMES.notifications) private readonly notifications: Queue,
  ) {}

  onModuleInit(): void {
    void this.refreshQueueMetrics();
    this.refreshTimer = setInterval(() => {
      void this.refreshQueueMetrics();
    }, 15_000);
    this.refreshTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  async listCounts(): Promise<Array<{ name: string; counts: QueueCounts }>> {
    const counts = await this.collectCounts();
    this.publishQueueMetrics(counts);
    return counts;
  }

  /** Recent BullMQ failed jobs across all application queues (newest first). */
  async listFailedJobs(limitPerQueue = 10): Promise<FailedQueueJob[]> {
    const take = Math.min(Math.max(limitPerQueue, 1), 50);
    const entries = this.queueEntries();
    const batches = await Promise.all(
      entries.map(async ([name, queue]) => {
        const jobs = await queue.getFailed(0, take - 1);
        return jobs.map((job) => mapFailedJob(name, job));
      }),
    );
    return batches.flat().sort((a, b) => {
      const aTs = a.finishedOn ?? a.timestamp ?? '';
      const bTs = b.finishedOn ?? b.timestamp ?? '';
      return bTs.localeCompare(aTs);
    });
  }

  private queueEntries(): Array<[string, Queue]> {
    return [
      [QUEUE_NAMES.discovery, this.discovery],
      [QUEUE_NAMES.crawl, this.crawl],
      [QUEUE_NAMES.ocr, this.ocr],
      [QUEUE_NAMES.ai, this.ai],
      [QUEUE_NAMES.geocoding, this.geocoding],
      [QUEUE_NAMES.searchIndex, this.searchIndex],
      [QUEUE_NAMES.notifications, this.notifications],
    ];
  }

  private async refreshQueueMetrics(): Promise<void> {
    try {
      const counts = await this.collectCounts();
      this.publishQueueMetrics(counts);
    } catch {
      // Metrics refresh must not crash the API process.
    }
  }

  private publishQueueMetrics(entries: Array<{ name: string; counts: QueueCounts }>): void {
    for (const entry of entries) {
      const length = entry.counts.waiting + entry.counts.active + entry.counts.delayed;
      metricsRegistry.setGauge('oeh_queue_length', { queue: entry.name }, length);
      metricsRegistry.setGauge('oeh_queue_failed', { queue: entry.name }, entry.counts.failed);
    }
  }

  private async collectCounts(): Promise<Array<{ name: string; counts: QueueCounts }>> {
    return Promise.all(
      this.queueEntries().map(async ([name, queue]) => {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        );
        return {
          name,
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
            paused: counts.paused ?? 0,
          },
        };
      }),
    );
  }
}
