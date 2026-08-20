import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildingLocalityFromLabel,
  normalizeVenueFields,
  streetLineFromAddress,
} from './venue-normalize.js';

describe('venue-normalize', () => {
  it('shortens address to street line', () => {
    assert.equal(
      streetLineFromAddress('Paradeplatz, 34613 Ziegenhain-Schwalmstadt, DE'),
      'Paradeplatz',
    );
    assert.equal(
      streetLineFromAddress('Bahnhofstraße 32, 34582 Borken (Hessen)'),
      'Bahnhofstraße 32',
    );
    assert.equal(streetLineFromAddress('Paradeplatz 34613 Ziegenhain'), 'Paradeplatz');
    assert.equal(streetLineFromAddress('  DE  '), null);
    assert.equal(streetLineFromAddress(null), null);
  });

  it('strips settlement from building locality', () => {
    assert.equal(buildingLocalityFromLabel('Schlosskirche Ziegenhain'), 'Schlosskirche');
    assert.equal(buildingLocalityFromLabel('Stadtkirche Treysa'), 'Stadtkirche');
    assert.equal(
      buildingLocalityFromLabel('Glashaus Borken (Hessen)', 'Borken (Hessen)'),
      'Glashaus',
    );
    assert.equal(buildingLocalityFromLabel('Treysa'), 'Treysa');
    assert.equal(buildingLocalityFromLabel('Festplatz'), 'Festplatz');
  });

  it('normalizes name and address together', () => {
    assert.deepEqual(
      normalizeVenueFields({
        name: 'Schlosskirche Ziegenhain',
        address: 'Paradeplatz, 34613 Ziegenhain-Schwalmstadt, DE',
      }),
      { name: 'Schlosskirche', address: 'Paradeplatz' },
    );
  });
});
