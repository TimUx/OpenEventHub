import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeCategoryKey, resolveDefaultCategorySlug } from './default-categories.js';

describe('default-categories', () => {
  it('normalizes umlauts and punctuation', () => {
    assert.equal(normalizeCategoryKey('Schützenfest'), 'schuetzenfest');
    assert.equal(normalizeCategoryKey('Tag der Offenen Tür'), 'tag der offenen tuer');
  });

  it('maps rural DE/EN labels to curated slugs', () => {
    assert.equal(resolveDefaultCategorySlug('Kirmes'), 'kirmes');
    assert.equal(resolveDefaultCategorySlug('traditionskirmes'), 'kirmes');
    assert.equal(resolveDefaultCategorySlug('Concerts'), 'konzert');
    assert.equal(resolveDefaultCategorySlug('Running'), 'sportveranstaltung');
    assert.equal(resolveDefaultCategorySlug('fire brigade'), 'feuerwehrfest');
    assert.equal(resolveDefaultCategorySlug('Sonstiges'), 'sonstiges');
  });

  it('returns null for unknown labels', () => {
    assert.equal(resolveDefaultCategorySlug('quantum-leap-expo'), null);
  });
});
