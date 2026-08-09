import { Inject, Injectable, Logger } from '@nestjs/common';
import { MediaRepository } from '@openeventhub/database';
import { metricsRegistry } from '@openeventhub/service-runtime';
import type { AiJobPayload, AiJobResult, ExtractedEventFields } from '@openeventhub/shared';
import {
  evaluateCategoryAllowlist,
  evaluateCoverageScope,
  inferAllDay,
  inferPlaceFromTitle,
  isEventNotExpired,
} from '@openeventhub/shared';
import { EventStatus, Prisma, PrismaClient } from '@prisma/client';

import { calculateConfidenceScore } from './domain/confidence.score.js';
import {
  appendEventVersion,
  buildExternalId,
  coalesceEventFields,
  ensureEventSourceLink,
  extractionToCoalesceInput,
  findMatchingEvent,
} from './domain/event-consolidate.js';
import { EventIntelligencePipeline } from './domain/intelligence.pipeline.js';
import { linkEventTaxonomy, matchCategoryIdsFromCatalog } from './domain/taxonomy-link.js';
import { GeocodingEnqueueService } from './geocoding-enqueue.service.js';
import { LLM_PROVIDER, type LlmProvider } from './ports/llm.provider.js';
import { PROMPT_REPOSITORY, type PromptRepository } from './ports/prompt.repository.js';

@Injectable()
export class AiProcessingService {
  private readonly logger = new Logger(AiProcessingService.name);
  private readonly pipeline: EventIntelligencePipeline;

  constructor(
    @Inject(LLM_PROVIDER) llm: LlmProvider,
    @Inject(PROMPT_REPOSITORY) prompts: PromptRepository,
    private readonly prisma: PrismaClient,
    private readonly geocoding: GeocodingEnqueueService,
  ) {
    this.pipeline = new EventIntelligencePipeline(llm, prompts);
  }

  async processJob(payload: AiJobPayload): Promise<AiJobResult> {
    const startedHr = process.hrtime.bigint();
    let status: 'success' | 'failed' = 'success';
    try {
      const result = await this.pipeline.process(payload);
      return await this.persistResult(payload, result);
    } catch (err) {
      status = 'failed';
      throw err;
    } finally {
      const seconds = Number(process.hrtime.bigint() - startedHr) / 1e9;
      metricsRegistry.observeHistogram('oeh_ai_processing_duration_seconds', { status }, seconds);
    }
  }

  private async persistResult(payload: AiJobPayload, result: AiJobResult): Promise<AiJobResult> {
    const extraction = this.resolveExtraction(payload, result.extraction);
    result = this.enrichPlaceFromTitle({ ...result, extraction });

    let eventId = payload.eventId ?? null;

    if (!eventId && this.canCreateEvent(extraction)) {
      const coverage = await this.evaluateGeographicCoverage(result);
      if (!coverage.inScope) {
        this.logger.log(
          `Skipped out-of-coverage event title=${JSON.stringify(extraction.title)} reason=${coverage.reason}`,
        );
        return result;
      }
      const categories = await this.evaluateCategoryImportAllowlist(result);
      if (!categories.allowed) {
        this.logger.log(
          `Skipped category-filtered event title=${JSON.stringify(extraction.title)} reason=${categories.reason}`,
        );
        return result;
      }
      eventId = await this.upsertEventFromExtraction(payload, result);
    }

    if (!eventId) {
      this.logger.warn(
        `AI result not persisted (no eventId and extraction not creatable) crawlResult=${payload.crawlResultId ?? 'n/a'} isEvent=${extraction.isEvent} title=${extraction.title ? 'yes' : 'no'} startAt=${extraction.startAt ? 'yes' : 'no'}`,
      );
      return result;
    }

    const sourceCount = await this.prisma.eventSource.count({ where: { eventId } });
    const imageUrls = collectImageUrls(result.extraction, payload);
    const confidenceScore = calculateConfidenceScore(result.extraction, {
      sourceCount: Math.max(1, sourceCount),
      hasImages: imageUrls.length > 0,
    });
    if (confidenceScore !== result.confidenceScore) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: { confidenceScore },
      });
      result = { ...result, confidenceScore };
    }

    const extractedFields = {
      extraction: { ...result.extraction },
      classification: {
        ...result.classification,
        categories: [...result.classification.categories],
        subcategories: [...result.classification.subcategories],
        tags: [...result.classification.tags],
      },
    } as Prisma.InputJsonValue;

    const analysis = await this.prisma.aIAnalysis.create({
      data: {
        eventId,
        ...(payload.crawlResultId ? { crawlResultId: payload.crawlResultId } : {}),
        promptId: result.prompts.extraction.id,
        promptVersion: result.prompts.extraction.version,
        model: result.model,
        provider: result.provider,
        extractedFields,
        confidence: result.confidenceScore,
      },
    });

    try {
      const linked = await linkEventTaxonomy(this.prisma, {
        eventId,
        extraction: result.extraction,
        classification: result.classification,
      });
      this.logger.log(
        `Taxonomy linked event=${eventId} categories=${linked.categoryIds.length} tags=${linked.tagIds.length} region=${linked.regionId ?? 'n/a'} venue=${linked.venueId ?? 'n/a'}`,
      );
      await this.geocoding.enqueueVenue(linked.venueId);
      if (!linked.venueId) {
        await this.geocoding.enqueueRegion(linked.regionId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Taxonomy link failed event=${eventId}: ${message}`);
    }

    if (imageUrls.length > 0) {
      try {
        const media = new MediaRepository(this.prisma);
        const rows = await media.syncImageUrls(eventId, imageUrls, {
          altText: result.extraction.title,
        });
        this.logger.log(`Media synced event=${eventId} images=${rows.length}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Media sync failed event=${eventId}: ${message}`);
      }
    }

    return {
      ...result,
      analysisId: analysis.id,
    };
  }

  private canCreateEvent(extraction: ExtractedEventFields): boolean {
    return Boolean(
      extraction.isEvent &&
      extraction.title?.trim() &&
      extraction.startAt &&
      isEventNotExpired(extraction.startAt, extraction.endAt),
    );
  }

  /**
   * Drop new events whose place lies outside the operator coverage set.
   * Empty coverage = filter disabled. Unknown place = allow (moderation).
   */
  private async evaluateGeographicCoverage(
    result: AiJobResult,
  ): Promise<{ readonly inScope: boolean; readonly reason: string }> {
    const scopeRootIds = (
      await this.prisma.coverageScopeRegion.findMany({ select: { regionId: true } })
    ).map((row) => row.regionId);

    if (scopeRootIds.length === 0) {
      return { inScope: true, reason: 'coverage_disabled' };
    }

    const regions = await this.prisma.region.findMany({
      select: { id: true, name: true, parentId: true },
    });

    const classification = result.classification;
    const extraction = result.extraction;
    const placeLabels = [
      classification.municipality,
      classification.district,
      classification.region,
      extraction.venueName,
      extraction.venueAddress,
    ];

    // Prefer matching against existing catalog rows when names already exist.
    let resolvedRegionId: string | null = null;
    for (const label of [
      classification.municipality,
      classification.district,
      classification.region,
    ]) {
      const name = label?.trim();
      if (!name) continue;
      const hit = regions.find((row) => row.name.toLowerCase() === name.toLowerCase());
      if (hit) {
        resolvedRegionId = hit.id;
        break;
      }
    }

    return evaluateCoverageScope({
      scopeRootIds,
      regions,
      placeLabels,
      resolvedRegionId,
    });
  }

  /**
   * Drop new events whose resolved categories lie outside the operator allowlist.
   * Empty allowlist = filter disabled. Unknown category = allow (moderation).
   */
  private async evaluateCategoryImportAllowlist(
    result: AiJobResult,
  ): Promise<{ readonly allowed: boolean; readonly reason: string }> {
    const allowlistRootIds = (
      await this.prisma.categoryImportAllowlist.findMany({ select: { categoryId: true } })
    ).map((row) => row.categoryId);

    if (allowlistRootIds.length === 0) {
      return { allowed: true, reason: 'allowlist_disabled' };
    }

    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
    });

    const labels = [...result.classification.categories, ...result.classification.subcategories];
    const resolvedCategoryIds = matchCategoryIdsFromCatalog(labels, categories, {
      title: result.extraction.title,
      summary: result.extraction.summary,
      description: result.extraction.description,
    });

    return evaluateCategoryAllowlist({
      allowlistRootIds,
      categories,
      resolvedCategoryIds,
    });
  }

  /** Prefer plugin-structured candidates when the LLM flips isEvent off. */
  private resolveExtraction(
    payload: AiJobPayload,
    extraction: ExtractedEventFields,
  ): ExtractedEventFields {
    const fromPlugin = payload.content.includes('Structured event candidate from HTML plugin');
    const pluginImages = parseImagesFromPluginContent(payload.content, payload.sourceUrl);
    const mergedImages = [
      ...new Set([...(extraction.images ?? []), ...pluginImages].filter(Boolean)),
    ];
    if (extraction.isEvent) {
      return {
        ...extraction,
        allDay: inferAllDay(extraction.startAt, extraction.endAt, extraction.allDay),
        ...(mergedImages.length > 0 ? { images: mergedImages } : {}),
      };
    }
    if (fromPlugin && extraction.title?.trim() && extraction.startAt) {
      const allDayMatch = /\ballDay:\s*(true|false)\b/i.exec(payload.content);
      const explicit =
        allDayMatch?.[1] != null ? allDayMatch[1].toLowerCase() === 'true' : extraction.allDay;
      return {
        ...extraction,
        isEvent: true,
        allDay: inferAllDay(extraction.startAt, extraction.endAt, explicit),
        ...(mergedImages.length > 0 ? { images: mergedImages } : {}),
      };
    }
    return mergedImages.length > 0 ? { ...extraction, images: mergedImages } : extraction;
  }

  /**
   * When listings omit venue, derive place from the title (e.g. "Kirmes Niedergrenzebach").
   * Prefer `place` (Ort) over inventing a Kommune; does not override existing fields.
   */
  private enrichPlaceFromTitle(result: AiJobResult): AiJobResult {
    const place = inferPlaceFromTitle(result.extraction.title);
    if (!place) {
      return result;
    }

    const venueName = result.extraction.venueName?.trim() || place;
    const placeField = result.classification.place?.trim() || place;
    if (venueName === result.extraction.venueName && placeField === result.classification.place) {
      return result;
    }

    this.logger.log(
      `Inferred place from title=${JSON.stringify(result.extraction.title)} place=${JSON.stringify(place)}`,
    );

    return {
      ...result,
      extraction: {
        ...result.extraction,
        venueName,
      },
      classification: {
        ...result.classification,
        place: placeField,
      },
    };
  }

  /**
   * Upsert path: same-source externalId → update; cross-source title+day match → consolidate;
   * otherwise create a new logical event.
   */
  private async upsertEventFromExtraction(
    payload: AiJobPayload,
    result: AiJobResult,
  ): Promise<string> {
    const extraction = result.extraction;
    const title = extraction.title!.trim();
    const startAt = new Date(extraction.startAt!);
    if (Number.isNaN(startAt.getTime())) {
      throw new Error(`Invalid extracted startAt: ${extraction.startAt}`);
    }
    const endAt =
      extraction.endAt && !Number.isNaN(new Date(extraction.endAt).getTime())
        ? new Date(extraction.endAt)
        : null;
    const allDay = inferAllDay(extraction.startAt, extraction.endAt, extraction.allDay);
    const externalId = buildExternalId(title, startAt);
    const incoming = extractionToCoalesceInput(
      extraction,
      startAt,
      endAt,
      allDay,
      result.confidenceScore,
    );

    if (payload.sourceId) {
      const existingLink = await this.prisma.eventSource.findUnique({
        where: {
          sourceId_externalId: {
            sourceId: payload.sourceId,
            externalId,
          },
        },
      });
      if (existingLink) {
        await this.mergeIntoEvent(existingLink.eventId, incoming, 'ai.ingest');
        this.logger.log(
          `Updated existing event ${existingLink.eventId} from same-source AI ingest`,
        );
        return existingLink.eventId;
      }
    }

    const match = await findMatchingEvent(this.prisma, {
      title,
      startAt,
      venueName: extraction.venueName,
    });
    if (match) {
      await this.mergeIntoEvent(match.id, incoming, 'ai.consolidate');
      if (payload.sourceId) {
        const linked = await ensureEventSourceLink(this.prisma, {
          eventId: match.id,
          sourceId: payload.sourceId,
          externalId,
          sourceUrl: payload.sourceUrl ?? null,
          confidenceScore: result.confidenceScore,
        });
        this.logger.log(
          `Consolidated into event ${match.id} sourceLinked=${linked.linked} sources=${linked.sourceCount}`,
        );
      } else {
        this.logger.log(`Consolidated into event ${match.id} (no sourceId on payload)`);
      }
      return match.id;
    }

    const slug = await this.allocateSlug(title, startAt);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          slug,
          title,
          summary: extraction.summary,
          description: extraction.description,
          startAt,
          endAt,
          allDay,
          confidenceScore: result.confidenceScore,
          status: EventStatus.pending_moderation,
        },
      });

      await tx.eventVersion.create({
        data: {
          eventId: created.id,
          versionNumber: 1,
          title: created.title,
          startAt: created.startAt,
          endAt: created.endAt,
          allDay: created.allDay,
          venueId: created.venueId,
          organizerId: created.organizerId,
          confidenceScore: created.confidenceScore,
          status: created.status,
          changeReason: 'ai.ingest',
        },
      });

      if (payload.sourceId) {
        await tx.eventSource.create({
          data: {
            eventId: created.id,
            sourceId: payload.sourceId,
            sourceUrl: payload.sourceUrl ?? null,
            externalId,
            confidenceScore: result.confidenceScore,
          },
        });
      }

      return created;
    });

    this.logger.log(
      `Created event ${event.id} from AI ingest title=${JSON.stringify(title)} status=${event.status}`,
    );
    return event.id;
  }

  private async mergeIntoEvent(
    eventId: string,
    incoming: ReturnType<typeof extractionToCoalesceInput>,
    changeReason: string,
  ): Promise<void> {
    const existing = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) {
      throw new Error(`Event ${eventId} not found for consolidate`);
    }

    const merged = coalesceEventFields(existing, incoming);
    if (!merged.changed) {
      return;
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: merged.title,
        summary: merged.summary,
        description: merged.description,
        endAt: merged.endAt,
        allDay: merged.allDay,
        confidenceScore: merged.confidenceScore,
      },
    });
    await appendEventVersion(this.prisma, updated, changeReason);
  }

  private async allocateSlug(title: string, startAt: Date): Promise<string> {
    const base = slugify(title).slice(0, 60) || 'event';
    const day = startAt.toISOString().slice(0, 10);
    let candidate = `${base}-${day}`;
    let n = 0;
    while (await this.prisma.event.findUnique({ where: { slug: candidate } })) {
      n += 1;
      candidate = `${base}-${day}-${n}`;
    }
    return candidate;
  }
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function collectImageUrls(extraction: ExtractedEventFields, payload: AiJobPayload): string[] {
  return [
    ...new Set(
      [
        ...(extraction.images ?? []),
        ...parseImagesFromPluginContent(payload.content, payload.sourceUrl),
      ]
        .map((url) => url.trim())
        .filter((url) => /^https?:\/\//i.test(url)),
    ),
  ];
}

function parseImagesFromPluginContent(content: string, sourceUrl?: string): string[] {
  const match = /^images:\s*(.+)$/m.exec(content);
  if (!match?.[1]) {
    return [];
  }
  const base = sourceUrl ?? 'https://example.invalid/';
  const out: string[] = [];
  for (const part of match[1].split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      const absolute = new URL(trimmed, base).toString();
      if (/^https?:\/\//i.test(absolute)) {
        out.push(absolute);
      }
    } catch {
      // skip invalid
    }
  }
  return out;
}
