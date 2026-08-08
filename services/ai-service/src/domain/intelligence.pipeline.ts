import type { AiJobPayload, AiJobResult } from '@openeventhub/shared';

import { calculateConfidenceScore } from '../domain/confidence.score.js';
import { parseClassificationJson, parseExtractionJson } from '../domain/json-parsers.js';
import { prepareContentForLlm } from '../domain/prepare-content.js';
import type { LlmProvider } from '../ports/llm.provider.js';
import { type PromptRepository, renderTemplate } from '../ports/prompt.repository.js';

const EXTRACTION_PROMPT = { id: 'event-extraction', version: '1.0.2' } as const;
const CLASSIFICATION_PROMPT = { id: 'event-classification', version: '1.0.2' } as const;

export interface IntelligencePipelineOptions {
  readonly sourceCount?: number;
  readonly hasImages?: boolean;
}

export class EventIntelligencePipeline {
  constructor(
    private readonly llm: LlmProvider,
    private readonly prompts: PromptRepository,
  ) {}

  async process(
    payload: AiJobPayload,
    options: IntelligencePipelineOptions = {},
  ): Promise<AiJobResult> {
    const content = prepareContentForLlm(payload.content);

    const extractionPrompt = await this.prompts.getPrompt(
      EXTRACTION_PROMPT.id,
      EXTRACTION_PROMPT.version,
    );
    const extractionCompletion = await this.llm.completeChat({
      responseFormat: extractionPrompt.meta.responseFormat,
      messages: [
        { role: 'system', content: extractionPrompt.system },
        {
          role: 'user',
          content: renderTemplate(extractionPrompt.user, {
            sourceUrl: payload.sourceUrl ?? '',
            content,
          }),
        },
      ],
    });
    const extraction = parseExtractionJson(extractionCompletion.content);

    const classificationPrompt = await this.prompts.getPrompt(
      CLASSIFICATION_PROMPT.id,
      CLASSIFICATION_PROMPT.version,
    );
    const classificationCompletion = await this.llm.completeChat({
      responseFormat: classificationPrompt.meta.responseFormat,
      messages: [
        { role: 'system', content: classificationPrompt.system },
        {
          role: 'user',
          content: renderTemplate(classificationPrompt.user, {
            extractedEvent: JSON.stringify(extraction),
          }),
        },
      ],
    });
    const classification = parseClassificationJson(classificationCompletion.content);

    const confidenceScore = calculateConfidenceScore(extraction, {
      ...(options.sourceCount !== undefined ? { sourceCount: options.sourceCount } : {}),
      ...(options.hasImages !== undefined ? { hasImages: options.hasImages } : {}),
    });

    return {
      extraction,
      classification,
      confidenceScore,
      prompts: {
        extraction: EXTRACTION_PROMPT,
        classification: CLASSIFICATION_PROMPT,
      },
      model: extractionCompletion.model,
      provider: extractionCompletion.provider,
    };
  }
}
