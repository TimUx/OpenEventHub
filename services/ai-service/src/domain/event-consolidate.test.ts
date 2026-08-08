import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  coalesceEventFields,
  normalizeTitleKey,
  selectBestMatch,
  titlesMatch,
  utcDayBounds,
  venuesCompatible,
} from './event-consolidate.js';

describe('event-consolidate', () => {
  it('normalizes titles for matching', () => {
    assert.equal(
      normalizeTitleKey('Kirmes Niedergrenzebach 2026'),
      normalizeTitleKey('kirmes niedergrenzebach'),
    );
    assert.ok(titlesMatch('Kirmes Niedergrenzebach', 'Kirmes Niedergrenzebach — Festplatz'));
    assert.equal(titlesMatch('Kirmes Treysa', 'Scherzmarkt in Treysa'), false);
  });

  it('computes UTC day bounds', () => {
    const { gte, lt } = utcDayBounds(new Date('2026-08-07T15:30:00.000Z'));
    assert.equal(gte.toISOString(), '2026-08-07T00:00:00.000Z');
    assert.equal(lt.toISOString(), '2026-08-08T00:00:00.000Z');
  });

  it('treats missing venues as compatible and conflicts as blocking', () => {
    assert.equal(venuesCompatible('Treysa', null, null), true);
    assert.equal(venuesCompatible('Treysa', 'Festplatz Treysa', null), true);
    assert.equal(venuesCompatible('Treysa', null, 'Treysa'), true);
    assert.equal(venuesCompatible('Treysa', 'Homberg', 'Homberg'), false);
  });

  it('coalesces only missing or thinner fields', () => {
    const merged = coalesceEventFields(
      {
        title: 'Kirmes',
        summary: null,
        description: 'Kurz',
        endAt: null,
        allDay: true,
        confidenceScore: 0.4,
      },
      {
        title: 'Kirmes Niedergrenzebach',
        summary: 'Dorfkirmes',
        description: 'Kurz',
        startAt: new Date('2026-08-07T00:00:00.000Z'),
        endAt: new Date('2026-08-08T00:00:00.000Z'),
        allDay: true,
        confidenceScore: 0.7,
      },
    );
    assert.equal(merged.title, 'Kirmes Niedergrenzebach');
    assert.equal(merged.summary, 'Dorfkirmes');
    assert.equal(merged.description, 'Kurz');
    assert.ok(merged.endAt);
    assert.equal(merged.confidenceScore, 0.7);
    assert.equal(merged.changed, true);
  });

  it('selects the richest matching candidate', () => {
    const best = selectBestMatch(
      [
        {
          id: 'a',
          title: 'Kirmes Niedergrenzebach',
          summary: null,
          description: null,
          startAt: new Date('2026-08-07T00:00:00.000Z'),
          endAt: null,
          allDay: true,
          confidenceScore: 0.3,
          venueId: null,
          venueName: null,
          venueCity: null,
        },
        {
          id: 'b',
          title: 'Kirmes Niedergrenzebach',
          summary: 'Fest',
          description: 'Länger',
          startAt: new Date('2026-08-07T00:00:00.000Z'),
          endAt: null,
          allDay: true,
          confidenceScore: 0.5,
          venueId: 'venue-1',
          venueName: 'Niedergrenzebach',
          venueCity: 'Niedergrenzebach',
        },
      ],
      'Kirmes Niedergrenzebach',
      'Niedergrenzebach',
    );
    assert.equal(best?.id, 'b');
  });
});
