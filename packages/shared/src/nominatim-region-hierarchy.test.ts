import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRegionHierarchyFromNominatim,
  isSettlementOrAdminNominatimHit,
  isUsableNominatimPlaceHit,
  looksLikeVenueOrAddressLabel,
  pickBestSettlementCandidate,
  settlementQueryFromLabel,
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

  it('rejects amenity/POI hits for AI settlement ingest', () => {
    assert.equal(
      isSettlementOrAdminNominatimHit({
        name: 'Stadtkirche Treysa',
        class: 'amenity',
        type: 'place_of_worship',
        addresstype: 'amenity',
      }),
      false,
    );
    assert.equal(
      isSettlementOrAdminNominatimHit({
        name: 'Wanderparkplatz an der Burgruine Wallenstein',
        class: 'amenity',
        type: 'parking',
        addresstype: 'parking',
      }),
      false,
    );
    assert.equal(
      isSettlementOrAdminNominatimHit({
        name: 'Treysa',
        class: 'place',
        type: 'suburb',
        addresstype: 'suburb',
        address: {
          suburb: 'Treysa',
          town: 'Schwalmstadt',
          county: 'Schwalm-Eder-Kreis',
          state: 'Hessen',
          country: 'Deutschland',
          country_code: 'de',
        },
      }),
      true,
    );
  });

  it('detects venue and street-address labels', () => {
    assert.equal(looksLikeVenueOrAddressLabel('Stadtkirche Treysa'), true);
    assert.equal(looksLikeVenueOrAddressLabel('Schlosskirche Ziegenhain'), true);
    assert.equal(looksLikeVenueOrAddressLabel('Dorfkirche Merzhausen'), true);
    assert.equal(looksLikeVenueOrAddressLabel('Zella Blauer Saal'), true);
    assert.equal(looksLikeVenueOrAddressLabel('Waßmuthshäuser Straße 15, Homberg (Efze)'), true);
    assert.equal(looksLikeVenueOrAddressLabel('Treysa'), false);
    assert.equal(looksLikeVenueOrAddressLabel('Ziegenhain'), false);
    assert.equal(settlementQueryFromLabel('Stadtkirche Treysa'), 'Treysa');
    assert.equal(settlementQueryFromLabel('Schlosskirche Ziegenhain'), 'Ziegenhain');
    assert.equal(settlementQueryFromLabel('Dorfkirche Merzhausen'), 'Merzhausen');
    assert.equal(settlementQueryFromLabel('Zella Blauer Saal'), 'Zella');
    assert.equal(
      settlementQueryFromLabel('Waßmuthshäuser Straße 15, Homberg (Efze)'),
      'Homberg (Efze)',
    );
  });

  it('picks settlement candidates and prefers municipality for address queries', () => {
    const treysaHit = {
      osm_type: 'relation',
      osm_id: 10,
      name: 'Treysa',
      class: 'place',
      type: 'suburb',
      addresstype: 'suburb',
      display_name: 'Treysa, Schwalmstadt, Schwalm-Eder-Kreis, Hessen, Deutschland',
      address: {
        suburb: 'Treysa',
        town: 'Schwalmstadt',
        county: 'Schwalm-Eder-Kreis',
        state: 'Hessen',
        country: 'Deutschland',
        country_code: 'de',
      },
    };
    const churchHit = {
      osm_type: 'node',
      osm_id: 11,
      name: 'Stadtkirche Treysa',
      class: 'amenity',
      type: 'place_of_worship',
      addresstype: 'amenity',
    };
    const picked = pickBestSettlementCandidate([churchHit, treysaHit], 'Stadtkirche Treysa');
    assert.equal(picked?.name, 'Treysa');
    assert.equal(picked?.leafType, 'suburb');

    const hombergHit = {
      osm_type: 'relation',
      osm_id: 20,
      name: 'Homberg (Efze)',
      class: 'boundary',
      type: 'administrative',
      addresstype: 'town',
      display_name: 'Homberg (Efze), Schwalm-Eder-Kreis, Hessen, Deutschland',
      address: {
        town: 'Homberg (Efze)',
        county: 'Schwalm-Eder-Kreis',
        state: 'Hessen',
        country: 'Deutschland',
        country_code: 'de',
      },
    };
    const streetPicked = pickBestSettlementCandidate(
      [hombergHit],
      'Waßmuthshäuser Straße 15, Homberg (Efze)',
    );
    assert.equal(streetPicked?.name, 'Homberg (Efze)');
    assert.equal(streetPicked?.leafType, 'municipality');
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
