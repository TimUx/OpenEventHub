import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  inferDefaultCategorySlugsFromText,
  normalizeCategoryKey,
  resolveCategorySlugsForEvent,
  resolveDefaultCategorySlug,
} from './default-categories.js';

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
    assert.equal(resolveDefaultCategorySlug('Tanzkurs'), 'tanzkurs');
    assert.equal(resolveDefaultCategorySlug('exhibition'), 'ausstellung');
    assert.equal(resolveDefaultCategorySlug('Sonstiges'), 'sonstiges');
  });

  it('returns null for unknown labels', () => {
    assert.equal(resolveDefaultCategorySlug('quantum-leap-expo'), null);
  });

  it('infers a single category from title text', () => {
    assert.deepEqual(inferDefaultCategorySlugsFromText('Kirmes Niedergrenzebach 2026'), ['kirmes']);
    assert.deepEqual(inferDefaultCategorySlugsFromText('Weihnachtsmarkt Treysa'), [
      'weihnachtsmarkt',
    ]);
    assert.deepEqual(inferDefaultCategorySlugsFromText('Paartanzkurs im Glashaus'), ['tanzkurs']);
  });

  it('falls back to Sonstiges when inference is ambiguous or empty', () => {
    assert.deepEqual(
      resolveCategorySlugsForEvent({
        labels: [],
        title: 'Gemeindeversammlung und Kirmes',
      }),
      ['sonstiges'],
    );
    assert.deepEqual(
      resolveCategorySlugsForEvent({
        labels: [],
        title: 'Nachbarschaftstreffen am Samstag',
      }),
      ['sonstiges'],
    );
    assert.deepEqual(
      resolveCategorySlugsForEvent({
        labels: ['Kirmes'],
        title: 'Anything',
      }),
      ['kirmes'],
    );
  });

  it('prefers specific alias over substring category (Weihnachtsmarkt vs Markt)', () => {
    assert.deepEqual(inferDefaultCategorySlugsFromText('Weihnachtsmarkt Treysa'), [
      'weihnachtsmarkt',
    ]);
  });
});
