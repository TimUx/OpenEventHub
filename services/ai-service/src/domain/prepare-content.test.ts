import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prepareContentForLlm } from './prepare-content.js';

describe('prepareContentForLlm', () => {
  it('strips tags and scripts', () => {
    const out = prepareContentForLlm(
      '<html><script>x()</script><style>.a{}</style><p>Kirmes <b>Verna</b></p></html>',
    );
    assert.match(out, /Kirmes/);
    assert.match(out, /Verna/);
    assert.doesNotMatch(out, /script|style|\.a/);
  });

  it('truncates long content', () => {
    const out = prepareContentForLlm('a'.repeat(20_000), 100);
    assert.ok(out.length < 200);
    assert.match(out, /truncated/);
  });
});
