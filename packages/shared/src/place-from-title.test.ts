import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { demotePlaceAdjective, inferPlaceFromTitle } from './place-from-title.js';

describe('inferPlaceFromTitle', () => {
  it('extracts place after event type', () => {
    assert.equal(inferPlaceFromTitle('Kirmes Niedergrenzebach'), 'Niedergrenzebach');
    assert.equal(inferPlaceFromTitle('Weindorf Hundshausen'), 'Hundshausen');
  });

  it('extracts place before event type', () => {
    assert.equal(inferPlaceFromTitle('Hauptschwenda Kirmes'), 'Hauptschwenda');
  });

  it('handles "in Place" phrasing', () => {
    assert.equal(inferPlaceFromTitle('Scherzmarkt in Treysa'), 'Treysa');
  });

  it('strips dash subtitles and leading numbers', () => {
    assert.equal(
      inferPlaceFromTitle('777 Jahrfeier Treysa — Historisches Wochenende'),
      'Treysa',
    );
  });

  it('demotes adjectival place forms', () => {
    assert.equal(demotePlaceAdjective('Merzhäuser'), 'Merzhausen');
    assert.equal(inferPlaceFromTitle('Merzhäuser Traditionskirmes'), 'Merzhausen');
  });

  it('returns null when no safe place is present', () => {
    assert.equal(inferPlaceFromTitle('Open Air'), null);
    assert.equal(inferPlaceFromTitle('Kirmes'), null);
    assert.equal(inferPlaceFromTitle(null), null);
    assert.equal(inferPlaceFromTitle(''), null);
  });

  it('does not invent a place when venue-like words are only event keywords', () => {
    assert.equal(inferPlaceFromTitle('Historisches Wochenende'), null);
  });
});
