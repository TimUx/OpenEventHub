import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { MAX_ADMIN_REGION_BULK, parseBulkRegionIds } from './admin-regions.bulk.js';

describe('parseBulkRegionIds', () => {
  it('deduplicates and trims ids', () => {
    assert.deepEqual(parseBulkRegionIds([' a ', 'b', 'a']), ['a', 'b']);
  });

  it('rejects empty or oversized batches', () => {
    assert.throws(() => parseBulkRegionIds('nope'), BadRequestException);
    assert.throws(() => parseBulkRegionIds([]), BadRequestException);
    assert.throws(
      () =>
        parseBulkRegionIds(Array.from({ length: MAX_ADMIN_REGION_BULK + 1 }, (_, i) => String(i))),
      BadRequestException,
    );
  });
});
