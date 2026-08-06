import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cronFromSchedulePreset,
  DEFAULT_SCHEDULE_PRESET,
  detectSchedulePreset,
  isSchedulePresetId,
  SCHEDULE_PRESET_CRONS,
} from './schedule-presets.js';

describe('schedule-presets', () => {
  it('maps presets to UTC cron expressions', () => {
    assert.equal(cronFromSchedulePreset('manual'), null);
    assert.equal(cronFromSchedulePreset('hourly'), SCHEDULE_PRESET_CRONS.hourly);
    assert.equal(cronFromSchedulePreset('every6h'), '0 */6 * * *');
    assert.equal(cronFromSchedulePreset('daily'), '0 6 * * *');
    assert.equal(cronFromSchedulePreset('weekly'), '0 6 * * 1');
    assert.equal(cronFromSchedulePreset('monthly'), '0 6 1 * *');
    assert.equal(cronFromSchedulePreset('custom', '  15 3 * * *  '), '15 3 * * *');
    assert.equal(cronFromSchedulePreset('custom', '   '), null);
  });

  it('detects presets from stored cron values', () => {
    assert.equal(detectSchedulePreset(null), 'manual');
    assert.equal(detectSchedulePreset(''), 'manual');
    assert.equal(detectSchedulePreset('0 */6 * * *'), 'every6h');
    assert.equal(detectSchedulePreset('0 6 * * *'), 'daily');
    assert.equal(detectSchedulePreset('15 3 * * 2'), 'custom');
  });

  it('validates preset ids and default', () => {
    assert.equal(DEFAULT_SCHEDULE_PRESET, 'every6h');
    assert.equal(isSchedulePresetId('daily'), true);
    assert.equal(isSchedulePresetId('nope'), false);
  });
});
