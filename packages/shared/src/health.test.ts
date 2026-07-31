import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createHealthResult, createReadinessResult, QUEUE_NAMES, SERVICE_NAMES } from './index.js';

describe('createHealthResult', () => {
  it('returns a timestamped ok payload', () => {
    const result = createHealthResult(SERVICE_NAMES.api, '0.1.0');

    assert.equal(result.status, 'ok');
    assert.equal(result.service, 'api');
    assert.equal(result.version, '0.1.0');
    assert.ok(Date.parse(result.timestamp));
  });
});

describe('createReadinessResult', () => {
  it('marks readiness ok when every check is ok', () => {
    const result = createReadinessResult(SERVICE_NAMES.api, '0.1.0', {
      postgres: 'ok',
      redis: 'ok',
    });

    assert.equal(result.status, 'ok');
  });

  it('marks readiness degraded when a check is degraded', () => {
    const result = createReadinessResult(SERVICE_NAMES.api, '0.1.0', {
      postgres: 'ok',
      redis: 'degraded',
    });

    assert.equal(result.status, 'degraded');
  });

  it('marks readiness error when any check fails', () => {
    const result = createReadinessResult(SERVICE_NAMES.api, '0.1.0', {
      postgres: 'error',
      redis: 'ok',
    });

    assert.equal(result.status, 'error');
  });
});

describe('contracts', () => {
  it('exposes the documented queue set', () => {
    assert.deepEqual(Object.values(QUEUE_NAMES).sort(), [
      'ai',
      'crawl',
      'discovery',
      'geocoding',
      'notifications',
      'ocr',
      'search-index',
    ]);
  });
});
