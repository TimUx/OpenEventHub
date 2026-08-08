import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateCoverageScope,
  expandCoverageRegionIds,
  normalizeCoverageKey,
} from './coverage-scope.js';

describe('coverage-scope', () => {
  const regions = [
    { id: 'he', name: 'Hessen', parentId: null },
    { id: 'sek', name: 'Schwalm-Eder-Kreis', parentId: 'he' },
    { id: 'treysa', name: 'Treysa', parentId: 'sek' },
    { id: 'ng', name: 'Niedergrenzebach', parentId: 'sek' },
    { id: 'vb', name: 'Vogelsbergkreis', parentId: 'he' },
    { id: 'alsfeld', name: 'Alsfeld', parentId: 'vb' },
    { id: 'mr', name: 'Marburg-Biedenkopf', parentId: 'he' },
    { id: 'marburg', name: 'Marburg', parentId: 'mr' },
  ];

  it('normalizes coverage keys', () => {
    assert.equal(normalizeCoverageKey('Schwalm-Eder-Kreis'), 'schwalm eder kreis');
  });

  it('expands Landkreis to all municipalities', () => {
    const allowed = expandCoverageRegionIds(['sek'], regions);
    assert.ok(allowed.has('sek'));
    assert.ok(allowed.has('treysa'));
    assert.ok(allowed.has('ng'));
    assert.equal(allowed.has('alsfeld'), false);
  });

  it('allows Schwalm-Eder-Kreis + Alsfeld combination', () => {
    const roots = ['sek', 'alsfeld'];
    assert.equal(
      evaluateCoverageScope({
        scopeRootIds: roots,
        regions,
        placeLabels: ['Niedergrenzebach'],
        resolvedRegionId: 'ng',
      }).inScope,
      true,
    );
    assert.equal(
      evaluateCoverageScope({
        scopeRootIds: roots,
        regions,
        placeLabels: ['Alsfeld'],
        resolvedRegionId: 'alsfeld',
      }).inScope,
      true,
    );
    assert.equal(
      evaluateCoverageScope({
        scopeRootIds: roots,
        regions,
        placeLabels: ['Marburg'],
        resolvedRegionId: 'marburg',
      }).inScope,
      false,
    );
  });

  it('matches by district label when municipality is not yet in the tree', () => {
    const decision = evaluateCoverageScope({
      scopeRootIds: ['sek'],
      regions,
      placeLabels: ['Schwalm-Eder-Kreis', 'IrgendwoNeu'],
      resolvedRegionId: null,
    });
    assert.equal(decision.inScope, true);
  });

  it('allows all when coverage is empty', () => {
    assert.equal(
      evaluateCoverageScope({
        scopeRootIds: [],
        regions,
        placeLabels: ['Marburg'],
        resolvedRegionId: 'marburg',
      }).inScope,
      true,
    );
  });

  it('allows unknown place when no labels', () => {
    assert.equal(
      evaluateCoverageScope({
        scopeRootIds: ['sek'],
        regions,
        placeLabels: [],
        resolvedRegionId: null,
      }).reason,
      'place_unknown',
    );
  });
});
