import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRegionHierarchyFromNominatim,
  isUsableNominatimPlaceHit,
  toRegionLookupCandidate,
  uniqueRegionLookupCandidates,
} from './nominatim-region-hierarchy.js';

describe('nominatim-region-hierarchy', () => {
  it('maps Wasenberg under Willingshausen / Schwalm-Eder-Kreis / Hessen', () => {
    const chain = buildRegionHierarchyFromNominatim({
      name: 'Wasenberg',
      addresstype: 'village',
      class: 'boundary',
      type: 'administrative',
      display_name: 'Wasenberg, Willingshausen, Schwalm-Eder-Kreis, Hessen, Deutschland',
      address: {
        village: 'Wasenberg',
        municipality: 'Willingshausen',
        county: 'Schwalm-Eder-Kreis',
        state: 'Hessen',
        'ISO3166-2-lvl4': 'DE-HE',
        country: 'Deutschland',
        country_code: 'de',
      },
    });
    assert.deepEqual(
      chain.map((n) => `${n.type}:${n.name}`),
      [
        'country:Deutschland',
        'state:Hessen',
        'district:Schwalm-Eder-Kreis',
        'municipality:Willingshausen',
        'suburb:Wasenberg',
      ],
    );
  });

  it('rejects peaks', () => {
    assert.equal(
      isUsableNominatimPlaceHit({
        name: 'Wasenberg',
        class: 'natural',
        type: 'peak',
        addresstype: 'peak',
      }),
      false,
    );
  });

  it('keeps ambiguous Merzhausen candidates distinct', () => {
    const hits = [
      {
        osm_type: 'relation',
        osm_id: 1,
        name: 'Merzhausen',
        class: 'boundary',
        type: 'administrative',
        addresstype: 'village',
        display_name: 'Merzhausen, Willingshausen, Schwalm-Eder-Kreis, Hessen, Deutschland',
        address: {
          village: 'Merzhausen',
          municipality: 'Willingshausen',
          county: 'Schwalm-Eder-Kreis',
          state: 'Hessen',
          country: 'Deutschland',
          country_code: 'de',
        },
      },
      {
        osm_type: 'relation',
        osm_id: 2,
        name: 'Merzhausen',
        class: 'boundary',
        type: 'administrative',
        addresstype: 'village',
        display_name: 'Merzhausen, Usingen, Hochtaunuskreis, Hessen, Deutschland',
        address: {
          village: 'Merzhausen',
          town: 'Usingen',
          county: 'Hochtaunuskreis',
          state: 'Hessen',
          country: 'Deutschland',
          country_code: 'de',
        },
      },
    ];
    const candidates = uniqueRegionLookupCandidates(
      hits.map((hit) => toRegionLookupCandidate(hit)!).filter(Boolean),
    );
    assert.equal(candidates.length, 2);
    assert.ok(candidates[0]?.label.includes('Willingshausen'));
    assert.ok(candidates[1]?.label.includes('Usingen'));
  });
});
