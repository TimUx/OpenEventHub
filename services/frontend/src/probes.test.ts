import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createHealthResult, createReadinessResult } from '@openeventhub/shared';

describe('frontend probe helpers', () => {
  it('builds health payload for frontend', () => {
    const result = createHealthResult('frontend', '0.1.0');
    assert.equal(result.service, 'frontend');
    assert.equal(result.status, 'ok');
  });

  it('builds readiness payload for frontend', () => {
    const result = createReadinessResult('frontend', '0.1.0', { runtime: 'ok' });
    assert.equal(result.status, 'ok');
  });
});
