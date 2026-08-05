import { Inject, Injectable } from '@nestjs/common';
import { metricsRegistry } from '@openeventhub/service-runtime';
import type { AiJobPayload, AiJobResult } from '@openeventhub/shared';
import { Prisma, PrismaClient } from '@prisma/client';

import { EventIntelligencePipeline } from './domain/intelligence.pipeline.js';
import { LLM_PROVIDER, type LlmProvider } from './ports/llm.provider.js';
import { PROMPT_REPOSITORY, type PromptRepository } from './ports/prompt.repository.js';

@Injectable()
export class AiProcessingService {
  private readonly pipeline: EventIntelligencePipeline;

  constructor(
    @Inject(LLM_PROVIDER) llm: LlmProvider,
    @Inject(PROMPT_REPOSITORY) prompts: PromptRepository,
    private readonly prisma: PrismaClient,
  ) {
    this.pipeline = new EventIntelligencePipeline(llm, prompts);
  }

  async processJob(payload: AiJobPayload): Promise<AiJobResult> {
    const startedHr = process.hrtime.bigint();
    let status: 'success' | 'failed' = 'success';
    try {
      const result = await this.pipeline.process(payload);
      return await this.persistAnalysis(payload, result);
    } catch (err) {
      status = 'failed';
      throw err;
    } finally {
      const seconds = Number(process.hrtime.bigint() - startedHr) / 1e9;
      metricsRegistry.observeHistogram('oeh_ai_processing_duration_seconds', { status }, seconds);
    }
  }

  private async persistAnalysis(payload: AiJobPayload, result: AiJobResult): Promise<AiJobResult> {
    if (!payload.eventId) {
      return result;
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
        eventId: payload.eventId,
        ...(payload.crawlResultId ? { crawlResultId: payload.crawlResultId } : {}),
        promptId: result.prompts.extraction.id,
        promptVersion: result.prompts.extraction.version,
        model: result.model,
        provider: result.provider,
        extractedFields,
        confidence: result.confidenceScore,
      },
    });

    return {
      ...result,
      analysisId: analysis.id,
    };
  }
}
