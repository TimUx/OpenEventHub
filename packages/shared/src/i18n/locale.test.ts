import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_LOCALE,
  parseAcceptLanguage,
  resolveLocale,
} from './locale.js';

describe('parseAcceptLanguage', () => {
  it('orders by q-factor', () => {
    assert.deepEqual(parseAcceptLanguage('fr-FR,en;q=0.8,de;q=0.9'), [
      'fr-fr',
      'de',
      'en',
    ]);
  });

  it('returns empty for missing header', () => {
    assert.deepEqual(parseAcceptLanguage(null), []);
    assert.deepEqual(parseAcceptLanguage(''), []);
  });
});

describe('resolveLocale', () => {
  it('defaults to German', () => {
    assert.equal(resolveLocale({}), DEFAULT_LOCALE);
    assert.equal(resolveLocale({ acceptLanguage: 'fr,it' }), 'de');
  });

  it('honors cookie over Accept-Language', () => {
    assert.equal(
      resolveLocale({ cookieLocale: 'en', acceptLanguage: 'de-DE,de;q=0.9' }),
      'en',
    );
  });

  it('picks first supported from Accept-Language', () => {
    assert.equal(resolveLocale({ acceptLanguage: 'fr,en-US;q=0.8' }), 'en');
    assert.equal(resolveLocale({ acceptLanguage: 'de-AT,en;q=0.5' }), 'de');
  });

  it('uses navigator languages when header absent', () => {
    assert.equal(resolveLocale({ navigatorLanguages: ['en-US', 'de'] }), 'en');
  });

  it('ignores invalid cookie values', () => {
    assert.equal(resolveLocale({ cookieLocale: 'fr', acceptLanguage: 'en' }), 'en');
  });
});
