import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatFetchFailure } from './openai-compatible.provider.js';

describe('formatFetchFailure', () => {
  it('includes URL and undici cause', () => {
    const cause = new Error('getaddrinfo ENOTFOUND ollama');
    const err = new Error('fetch failed');
    err.cause = cause;
    const message = formatFetchFailure('http://ollama:11434/v1/chat/completions', err);
    assert.match(message, /LLM fetch failed/);
    assert.match(message, /ollama:11434/);
    assert.match(message, /ENOTFOUND ollama/);
  });

  it('falls back when cause is absent', () => {
    const message = formatFetchFailure('http://example/v1', new Error('fetch failed'));
    assert.equal(message, 'LLM fetch failed (http://example/v1): fetch failed');
  });
});
