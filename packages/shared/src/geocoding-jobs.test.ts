import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { geocodingJobId } from './geocoding-jobs.js';
import { parseNominatimCoordinates } from './nominatim-client.js';

describe('geocoding contracts', () => {
  it('builds stable job ids', () => {
    assert.equal(geocodingJobId({ venueId: 'v1' }), 'venue-v1');
    assert.equal(geocodingJobId({ regionId: 'r1' }), 'region-r1');
  });

  it('parses nominatim coordinates', () => {
    assert.deepEqual(parseNominatimCoordinates({ lat: '50.921', lon: '9.247' }), {
      latitude: 50.921,
      longitude: 9.247,
    });
    assert.equal(parseNominatimCoordinates({ lat: 'x', lon: '9' }), null);
    assert.equal(parseNominatimCoordinates(null), null);
  });
});
