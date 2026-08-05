import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ACCENT_THEMES,
  MIN_ACCENT_CONTRAST,
  accentMeetsContrast,
  contrastRatio,
  isAccentId,
} from './accent-theme.js';

describe('accent-theme', () => {
  it('only offers accents that meet WCAG AA on primary surfaces', () => {
    for (const theme of ACCENT_THEMES) {
      assert.ok(
        accentMeetsContrast(theme.light),
        `${theme.id} light contrast too low: ${contrastRatio(theme.light.primaryContrast, theme.light.primary).toFixed(2)}`,
      );
      assert.ok(
        accentMeetsContrast(theme.dark),
        `${theme.id} dark contrast too low: ${contrastRatio(theme.dark.primaryContrast, theme.dark.primary).toFixed(2)}`,
      );
    }
  });

  it('requires at least AA contrast threshold', () => {
    assert.equal(MIN_ACCENT_CONTRAST, 4.5);
  });

  it('validates accent ids', () => {
    assert.equal(isAccentId('blue'), true);
    assert.equal(isAccentId('purple'), false);
    assert.equal(isAccentId(null), false);
  });
});
