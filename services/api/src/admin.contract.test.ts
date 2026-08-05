import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { QUEUE_NAMES } from '@openeventhub/shared';

describe('admin ops contracts', () => {
  it('exposes all documented worker queues for visibility', () => {
    const names = Object.values(QUEUE_NAMES);
    for (const required of [
      'discovery',
      'crawl',
      'ocr',
      'ai',
      'geocoding',
      'search-index',
      'notifications',
    ]) {
      assert.ok(names.includes(required as (typeof names)[number]), `missing queue ${required}`);
    }
  });
});
