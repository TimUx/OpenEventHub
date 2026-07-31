import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { apiKeyHint, decryptSecret, deriveSettingsKey, encryptSecret } from './secret-box.js';

describe('secret-box', () => {
  it('round-trips secrets', () => {
    const key = deriveSettingsKey('test-encryption-secret');
    const encrypted = encryptSecret('sk-test-123456', key);
    assert.equal(decryptSecret(encrypted, key), 'sk-test-123456');
    assert.equal(apiKeyHint('sk-test-123456'), '****3456');
  });
});
