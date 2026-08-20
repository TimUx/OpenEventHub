import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';

import {
  CrawlJobStatus,
  CrawlResultStatus,
  PrismaClient,
  SourceRepository,
} from '@openeventhub/database';
import type { CrawlPlugin } from '@openeventhub/plugin-sdk';
import { metricsRegistry } from '@openeventhub/service-runtime';
import type {
  AiJobPayload,
  CrawlJobPayload,
  ExtractedEventFields,
  OcrJobPayload,
} from '@openeventhub/shared';
import { filterNotExpiredEvents } from '@openeventhub/shared';

import { ObjectStorageService } from '../object-storage/object-storage.service.js';
import { PluginRegistryService } from '../plugins/plugin-registry.service.js';
import type { DownstreamJobPublisher } from './downstream-job.publisher.js';
import { requiresOcr } from './mime-routing.js';

@Injectable()
export class CrawlProcessingService {
  private readonly logger = new Logger(CrawlProcessingService.name);

  constructor(
    private readonly sources: SourceRepository,
    private readonly prisma: PrismaClient,
    private readonly objectStorage: ObjectStorageService,
    private readonly plugins: PluginRegistryService,
    private readonly downstream: DownstreamJobPublisher,
  ) {}

  async process(job: CrawlJobPayload): Promise<void> {
    if (job.scheduleCron) {
      await this.processScheduleTick(job.scheduleCron);
      return;
    }
    if (!job.sourceId) {
      throw new Error('CrawlJobPayload requires sourceId or scheduleCron');
    }
    await this.processSource(job.sourceId);
  }

  /** Run all enabled sources for one cron pattern one after another. */
  private async processScheduleTick(scheduleCron: string): Promise<void> {
    const sources = await this.sources.listByScheduleCron(scheduleCron);
    this.logger.log(
      `Schedule tick cron=${JSON.stringify(scheduleCron)} sources=${sources.length} (serial)`,
    );
    for (const source of sources) {
      try {
        await this.processSource(source.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Schedule tick continued after failure source=${source.id}: ${message}`);
      }
    }
  }

  private async processSource(sourceId: string): Promise<void> {
    const source = await this.sources.findById(sourceId);
    if (!source) {
      throw new Error(`Cannot process crawl job: Source '${sourceId}' not found`);
    }

    const plugin = this.plugins.getPlugin(source.pluginType);
    this.assertPluginSupportsSource(plugin, source.url);
    const pluginType = plugin.metadata.pluginType;
    const startedHr = process.hrtime.bigint();

    const scheduledAt = new Date();
    const startedAt = new Date();

    const crawlJob = await this.prisma.crawlJob.create({
      data: {
        source: { connect: { id: source.id } },
        status: CrawlJobStatus.running,
        scheduledAt,
        startedAt,
        errorMessage: null,
      },
    });

    try {
      const pluginContext = {
        pluginType: plugin.metadata.pluginType,
        sourceUrl: source.url,
        sourceConfig: source.config,
        crawlJobId: crawlJob.id,
      };

      await plugin.initialize({
        pluginType: plugin.metadata.pluginType,
        sourceConfig: source.config,
      });

      const discovery = await plugin.discover(pluginContext);
      const targetUrl = discovery.urls[0] ?? source.url;

      const fetchContext = { ...pluginContext, sourceUrl: targetUrl };
      const fetchResult = await plugin.fetch(fetchContext);

      const parsed = await plugin.parse(fetchResult);
      const normalized = await plugin.normalize(parsed);
      const pluginEvents = filterNotExpiredEvents(
        (await plugin.emit(normalized)).filter((event) => event.isEvent),
      );

      const contentHash = crypto.createHash('sha256').update(fetchResult.content).digest('hex');

      const prior = await this.prisma.crawlResult.findFirst({
        where: {
          contentHash,
          status: CrawlResultStatus.success,
          crawlJob: { sourceId: source.id },
        },
        orderBy: { fetchedAt: 'desc' },
      });

      if (prior) {
        const skipped = await this.prisma.crawlResult.create({
          data: {
            crawlJob: { connect: { id: crawlJob.id } },
            objectKey: prior.objectKey,
            contentHash,
            status: CrawlResultStatus.skipped,
            mimeType: fetchResult.mimeType,
            byteSize: fetchResult.content.byteLength,
            fetchedAt: new Date(),
          },
        });

        await this.finishSuccess(crawlJob.id, source.id);
        // Re-enqueue AI/OCR so a prior AI failure can recover without content changes.
        await this.enqueueDownstream({
          mimeType: fetchResult.mimeType,
          objectKey: prior.objectKey,
          crawlResultId: skipped.id,
          crawlJobId: crawlJob.id,
          sourceUrl: targetUrl,
          sourceId: source.id,
          content: fetchResult.content,
          pluginEvents,
        });
        this.recordCrawlMetrics(pluginType, 'skipped', startedHr);
        this.logger.log(
          `Crawl skipped unchanged content source=${source.id} contentHash=${contentHash} pluginEvents=${pluginEvents.length} (downstream re-enqueued)`,
        );
        return;
      }

      const objectKey = `crawl-results/${crawlJob.id}/${contentHash}`;

      await this.objectStorage.putObject({
        key: objectKey,
        body: fetchResult.content,
        contentType: fetchResult.mimeType,
      });

      const crawlResult = await this.prisma.crawlResult.create({
        data: {
          crawlJob: { connect: { id: crawlJob.id } },
          objectKey,
          contentHash,
          status: CrawlResultStatus.success,
          mimeType: fetchResult.mimeType,
          byteSize: fetchResult.content.byteLength,
          fetchedAt: new Date(),
        },
      });

      await this.finishSuccess(crawlJob.id, source.id);

      await this.enqueueDownstream({
        mimeType: fetchResult.mimeType,
        objectKey,
        crawlResultId: crawlResult.id,
        crawlJobId: crawlJob.id,
        sourceUrl: targetUrl,
        sourceId: source.id,
        content: fetchResult.content,
        pluginEvents,
      });

      this.recordCrawlMetrics(pluginType, 'success', startedHr);
      this.logger.log(
        `Crawl completed source=${source.id} plugin=${plugin.metadata.pluginType} objectKey=${objectKey} pluginEvents=${pluginEvents.length}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: CrawlJobStatus.failed,
          completedAt: new Date(),
          errorMessage: message,
        },
      });
      await this.prisma.source.update({
        where: { id: source.id },
        data: {
          lastError: message,
        },
      });
      this.recordCrawlMetrics(pluginType, 'failed', startedHr);
      metricsRegistry.incrementCounter('oeh_failed_imports_total', { plugin: pluginType });
      this.logger.error(`Crawl job failed source=${source.id}: ${message}`);
      throw err;
    }
  }

  private recordCrawlMetrics(
    pluginType: string,
    status: 'success' | 'skipped' | 'failed',
    startedHr: bigint,
  ): void {
    const seconds = Number(process.hrtime.bigint() - startedHr) / 1e9;
    metricsRegistry.observeHistogram(
      'oeh_crawl_duration_seconds',
      { plugin: pluginType, status },
      seconds,
    );
  }

  private async finishSuccess(crawlJobId: string, sourceId: string): Promise<void> {
    await this.prisma.crawlJob.update({
      where: { id: crawlJobId },
      data: {
        status: CrawlJobStatus.completed,
        completedAt: new Date(),
        errorMessage: null,
      },
    });

    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        lastCrawlAt: new Date(),
        lastError: null,
      },
    });
  }

  private async enqueueDownstream(args: {
    readonly mimeType: string;
    readonly objectKey: string;
    readonly crawlResultId: string;
    readonly crawlJobId: string;
    readonly sourceUrl: string;
    readonly sourceId: string;
    readonly content: Buffer;
    readonly pluginEvents?: readonly ExtractedEventFields[];
  }): Promise<void> {
    if (requiresOcr(args.mimeType)) {
      const payload: OcrJobPayload = {
        objectKey: args.objectKey,
        mimeType: args.mimeType,
        crawlResultId: args.crawlResultId,
        sourceUrl: args.sourceUrl,
        crawlJobId: args.crawlJobId,
        sourceId: args.sourceId,
      };
      await this.downstream.enqueueOcr(payload);
      return;
    }

    const pluginEvents = args.pluginEvents ?? [];
    if (pluginEvents.length > 0) {
      for (const event of pluginEvents) {
        const payload: AiJobPayload = {
          content: formatPluginEventForAi(event, args.sourceUrl),
          sourceUrl: args.sourceUrl,
          crawlResultId: args.crawlResultId,
          jobId: args.crawlJobId,
          sourceId: args.sourceId,
          pluginEvent: event,
        };
        await this.downstream.enqueueAi(payload);
      }
      this.logger.log(
        `Enqueued ${pluginEvents.length} AI job(s) from plugin events source=${args.sourceId}`,
      );
      return;
    }

    const payload: AiJobPayload = {
      content: args.content.toString('utf-8'),
      sourceUrl: args.sourceUrl,
      crawlResultId: args.crawlResultId,
      jobId: args.crawlJobId,
      sourceId: args.sourceId,
    };
    await this.downstream.enqueueAi(payload);
  }

  private assertPluginSupportsSource(plugin: CrawlPlugin, sourceUrl: string): void {
    assert.ok(plugin, 'plugin required');
    assert.ok(sourceUrl, 'sourceUrl required');
  }
}

function formatPluginEventForAi(event: ExtractedEventFields, sourceUrl: string): string {
  const images = resolveImageUrls(event.images, sourceUrl);
  const lines = [
    `Source URL: ${sourceUrl}`,
    'Structured event candidate from HTML plugin:',
    `title: ${event.title ?? ''}`,
    `startAt: ${event.startAt ?? ''}`,
    `endAt: ${event.endAt ?? ''}`,
    `allDay: ${event.allDay ? 'true' : 'false'}`,
    `summary: ${event.summary ?? ''}`,
    `description: ${event.description ?? ''}`,
    `venueName: ${event.venueName ?? ''}`,
    `venueAddress: ${event.venueAddress ?? ''}`,
    `organizerName: ${event.organizerName ?? ''}`,
    `sourceCategories: ${(event.sourceCategories ?? []).join(', ')}`,
    `isRecurring: ${event.isRecurring ? 'true' : 'false'}`,
    `extractionConfidence: ${event.extractionConfidence}`,
    ...(images.length > 0 ? [`images: ${images.join(', ')}`] : []),
    '',
    event.allDay
      ? 'This content describes exactly one public all-day event (date only, no clock time). Preserve the given title and ISO dates; do not invent times.'
      : 'This content describes exactly one public event. Preserve the given title and ISO datetimes.',
  ];
  return lines.join('\n');
}

function resolveImageUrls(urls: readonly string[] | undefined, baseUrl: string): string[] {
  if (!urls?.length) return [];
  const out: string[] = [];
  for (const raw of urls) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const absolute = new URL(trimmed, baseUrl).toString();
      if (/^https?:\/\//i.test(absolute)) {
        out.push(absolute);
      }
    } catch {
      // skip invalid
    }
  }
  return [...new Set(out)];
}
