import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createHealthResult, createReadinessResult } from '@openeventhub/shared';

describe('admin probe helpers', () => {
  it('builds health payload for admin', () => {
    const result = createHealthResult('admin', '0.8.0');
    assert.equal(result.service, 'admin');
    assert.equal(result.status, 'ok');
  });

  it('builds readiness payload for admin', () => {
    const result = createReadinessResult('admin', '0.8.0', { runtime: 'ok' });
    assert.equal(result.status, 'ok');
  });
});
