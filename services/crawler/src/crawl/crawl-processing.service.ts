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
import type { AiJobPayload, CrawlJobPayload, OcrJobPayload } from '@openeventhub/shared';

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
    const source = await this.sources.findById(job.sourceId);
    if (!source) {
      throw new Error(`Cannot process crawl job: Source '${job.sourceId}' not found`);
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
      await plugin.emit(normalized);

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
        await this.prisma.crawlResult.create({
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
        this.recordCrawlMetrics(pluginType, 'skipped', startedHr);
        this.logger.log(
          `Crawl skipped unchanged content source=${source.id} contentHash=${contentHash}`,
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
        content: fetchResult.content,
      });

      this.recordCrawlMetrics(pluginType, 'success', startedHr);
      this.logger.log(
        `Crawl completed source=${source.id} plugin=${plugin.metadata.pluginType} objectKey=${objectKey}`,
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
    readonly content: Buffer;
  }): Promise<void> {
    if (requiresOcr(args.mimeType)) {
      const payload: OcrJobPayload = {
        objectKey: args.objectKey,
        mimeType: args.mimeType,
        crawlResultId: args.crawlResultId,
        sourceUrl: args.sourceUrl,
        crawlJobId: args.crawlJobId,
      };
      await this.downstream.enqueueOcr(payload);
      return;
    }

    const payload: AiJobPayload = {
      content: args.content.toString('utf-8'),
      sourceUrl: args.sourceUrl,
      crawlResultId: args.crawlResultId,
      jobId: args.crawlJobId,
    };
    await this.downstream.enqueueAi(payload);
  }

  private assertPluginSupportsSource(plugin: CrawlPlugin, sourceUrl: string): void {
    assert.ok(plugin, 'plugin required');
    assert.ok(sourceUrl, 'sourceUrl required');
  }
}
