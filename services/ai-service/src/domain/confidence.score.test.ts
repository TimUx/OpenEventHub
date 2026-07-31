import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ExtractedEventFields } from '@openeventhub/shared';

import { calculateConfidenceScore } from './confidence.score.js';

const base: ExtractedEventFields = {
  isEvent: true,
  title: 'Concert',
  summary: null,
  description: null,
  startAt: null,
  endAt: null,
  organizerName: null,
  venueName: null,
  venueAddress: null,
  isRecurring: false,
  extractionConfidence: 0,
};

describe('calculateConfidenceScore', () => {
  it('scores date, venue, organizer, address, images, sources and agreement', () => {
    const score = calculateConfidenceScore(
      {
        ...base,
        startAt: '2026-08-01T18:00:00Z',
        venueName: 'Hall',
        organizerName: 'Org',
        venueAddress: 'Street 1',
        extractionConfidence: 1,
      },
      { sourceCount: 2, hasImages: true },
    );

    // 20+15+10+10+10+15+20 = 100 → 1.0
    assert.equal(score, 1);
  });

  it('returns partial score when fields are missing', () => {
    const score = calculateConfidenceScore({
      ...base,
      startAt: '2026-08-01T18:00:00Z',
      extractionConfidence: 0.5,
    });

    // 20 + 10 = 30 → 0.3
    assert.equal(score, 0.3);
  });
});
