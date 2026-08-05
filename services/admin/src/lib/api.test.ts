import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPublicApiBase } from './api.js';

describe('admin api helpers', () => {
  it('resolves API base without trailing slash', () => {
    assert.ok(!getPublicApiBase().endsWith('/'));
  });
});
