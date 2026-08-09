import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseNominatimCoordinates } from '@openeventhub/shared';

describe('worker geocoding helpers', () => {
  it('accepts german place coordinates', () => {
    const coords = parseNominatimCoordinates({ lat: '50.921508', lon: '9.246844' });
    assert.ok(coords);
    assert.ok(coords.latitude > 50 && coords.latitude < 51);
    assert.ok(coords.longitude > 9 && coords.longitude < 10);
  });
});
