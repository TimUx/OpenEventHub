import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  crawlScheduleRepeatableJobId,
  uniqueEnabledScheduleCrons,
} from './crawl-jobs.js';

describe('crawl schedule helpers', () => {
  it('dedupes enabled schedule crons', () => {
    const patterns = uniqueEnabledScheduleCrons([
      { scheduleCron: '0 */6 * * *', status: 'healthy' },
      { scheduleCron: '0 */6 * * *', status: 'healthy' },
      { scheduleCron: '0 * * * *', status: 'healthy' },
      { scheduleCron: '0 */6 * * *', status: 'disabled' },
      { scheduleCron: null, status: 'healthy' },
      { scheduleCron: '  ', status: 'healthy' },
    ]);
    assert.deepEqual(patterns, ['0 * * * *', '0 */6 * * *']);
  });

  it('builds a stable repeatable job id', () => {
    assert.equal(
      crawlScheduleRepeatableJobId('0 */6 * * *'),
      'schedule:0_*/6_*_*_*',
    );
  });
});
