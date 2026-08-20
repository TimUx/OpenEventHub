import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldSkipApiThrottle } from './throttle-skip.js';

describe('shouldSkipApiThrottle', () => {
  it('skips probes', () => {
    assert.equal(shouldSkipApiThrottle('/health'), true);
    assert.equal(shouldSkipApiThrottle('/ready'), true);
    assert.equal(shouldSkipApiThrottle('/metrics'), true);
  });

  it('skips JWT admin routes including bulk mutations', () => {
    assert.equal(shouldSkipApiThrottle('/api/v1/admin/events'), true);
    assert.equal(shouldSkipApiThrottle('/api/v1/admin/events/bulk-status'), true);
    assert.equal(shouldSkipApiThrottle('/api/v1/admin/events/counts?x=1'), true);
  });

  it('keeps public API and login throttled', () => {
    assert.equal(shouldSkipApiThrottle('/api/v1/events'), false);
    assert.equal(shouldSkipApiThrottle('/api/v1/auth/login'), false);
    assert.equal(shouldSkipApiThrottle('/graphql'), false);
  });
});
