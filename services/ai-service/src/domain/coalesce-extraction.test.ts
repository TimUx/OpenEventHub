import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ExtractedEventFields } from '@openeventhub/shared';

import { coalesceExtractedEventFields } from './coalesce-extraction.js';

const llm: ExtractedEventFields = {
  isEvent: true,
  title: 'LLM title',
  summary: 'kurz',
  description: null,
  startAt: '2026-08-21T18:00:00.000Z',
  endAt: null,
  organizerName: null,
  venueName: 'Borken',
  venueAddress: null,
  isRecurring: false,
  extractionConfidence: 0.4,
};

describe('coalesceExtractedEventFields', () => {
  it('keeps plugin description, venue and source categories over LLM gaps', () => {
    const plugin: ExtractedEventFields = {
      isEvent: true,
      title: 'Euer gemeinsamer Takt',
      summary: null,
      description: 'Paartanzkurs mit Anne',
      startAt: '2026-08-21T18:00:00.000Z',
      endAt: '2026-08-21T19:30:00.000Z',
      organizerName: 'Rotkäppchenland',
      venueName: 'Glashaus Borken (Hessen)',
      venueAddress: 'Bahnhofstraße 32, 34582 Borken (Hessen)',
      isRecurring: true,
      extractionConfidence: 0.95,
      sourceCategories: ['Tanzkurs'],
    };

    const merged = coalesceExtractedEventFields(plugin, llm);
    assert.equal(merged.title, 'Euer gemeinsamer Takt');
    assert.equal(merged.description, 'Paartanzkurs mit Anne');
    assert.equal(merged.venueName, 'Glashaus Borken (Hessen)');
    assert.equal(merged.venueAddress, 'Bahnhofstraße 32, 34582 Borken (Hessen)');
    assert.deepEqual(merged.sourceCategories, ['Tanzkurs']);
    assert.equal(merged.endAt, '2026-08-21T19:30:00.000Z');
  });
});
