import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatEventDate, getPublicApiBase, getServerApiBase, getSiteUrl } from './api.js';

describe('frontend api helpers', () => {
  it('formats event dates', () => {
    const formatted = formatEventDate('2026-08-15T17:00:00.000Z');
    assert.match(formatted, /2026/);
  });

  it('resolves API bases without trailing slash', () => {
    assert.ok(!getPublicApiBase().endsWith('/'));
    assert.ok(!getServerApiBase().endsWith('/'));
  });

  it('resolves site URL without trailing slash', () => {
    assert.ok(!getSiteUrl().endsWith('/'));
  });
});
