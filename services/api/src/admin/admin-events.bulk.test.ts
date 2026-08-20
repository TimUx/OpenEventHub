import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { MAX_ADMIN_EVENT_BULK, parseBulkEventIds } from './admin-events.bulk.js';

describe('parseBulkEventIds', () => {
  it('deduplicates and trims ids', () => {
    assert.deepEqual(parseBulkEventIds([' a ', 'b', 'a']), ['a', 'b']);
  });

  it('rejects empty or oversized batches', () => {
    assert.throws(() => parseBulkEventIds('nope'), BadRequestException);
    assert.throws(() => parseBulkEventIds([]), BadRequestException);
    assert.throws(
      () =>
        parseBulkEventIds(Array.from({ length: MAX_ADMIN_EVENT_BULK + 1 }, (_, i) => String(i))),
      BadRequestException,
    );
  });
});
