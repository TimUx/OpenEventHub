import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FakeLlmProvider } from '../adapters/fake-llm.provider.js';
import { FilePromptRepository } from '../adapters/file-prompt.repository.js';
import { EventIntelligencePipeline } from './intelligence.pipeline.js';

const promptsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../prompts',
);

describe('EventIntelligencePipeline', () => {
  it('runs extraction, classification and confidence using prompts from disk', async () => {
    const llm = new FakeLlmProvider([
      JSON.stringify({
        isEvent: true,
        title: 'Open Air',
        summary: 'Music in the park',
        description: null,
        startAt: '2026-08-15T17:00:00Z',
        endAt: null,
        organizerName: 'City Culture',
        venueName: 'Stadtpark',
        venueAddress: 'Parkweg 1',
        isRecurring: false,
        extractionConfidence: 0.9,
      }),
      JSON.stringify({
        categories: ['Music'],
        subcategories: ['Open Air'],
        tags: ['outdoor'],
        region: 'Bayern',
        municipality: 'München',
        district: null,
        classificationConfidence: 0.8,
      }),
    ]);

    const pipeline = new EventIntelligencePipeline(llm, new FilePromptRepository(promptsRoot));
    const result = await pipeline.process({
      content: 'Open Air am 15.08. im Stadtpark',
      sourceUrl: 'https://example.test/events/1',
    });

    assert.equal(result.extraction.title, 'Open Air');
    assert.deepEqual(result.classification.categories, ['Music']);
    assert.equal(result.prompts.extraction.id, 'event-extraction');
    assert.equal(result.prompts.extraction.version, '1.0.1');
    assert.equal(result.prompts.classification.version, '1.0.1');
    assert.ok(result.confidenceScore > 0.5);
    assert.equal(llm.calls.length, 2);
    assert.match(llm.calls[0]?.messages[0]?.content ?? '', /Event Intelligence Engine extractor/);
  });
});
