import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRegionForest,
  collectExpandableIds,
  defaultExpandedIds,
  flattenVisible,
  formatRegionPath,
} from './region-tree.js';

const sample = [
  {
    id: 'de',
    name: 'Deutschland',
    slug: 'deutschland',
    type: 'country',
    parentId: null,
    isoCode: 'DE',
  },
  {
    id: 'he',
    name: 'Hessen',
    slug: 'hessen',
    type: 'state',
    parentId: 'de',
    isoCode: null,
  },
  {
    id: 'sek',
    name: 'Schwalm-Eder-Kreis',
    slug: 'sek',
    type: 'district',
    parentId: 'he',
    isoCode: null,
  },
  {
    id: 'wil',
    name: 'Willingshausen',
    slug: 'willingshausen',
    type: 'municipality',
    parentId: 'sek',
    isoCode: null,
  },
  {
    id: 'mer',
    name: 'Merzhausen',
    slug: 'merzhausen',
    type: 'suburb',
    parentId: 'wil',
    isoCode: null,
  },
  {
    id: 'was',
    name: 'Wasenberg',
    slug: 'wasenberg',
    type: 'suburb',
    parentId: 'wil',
    isoCode: null,
  },
  {
    id: 'orphan',
    name: 'Orphan',
    slug: 'orphan',
    type: 'suburb',
    parentId: 'missing',
    isoCode: null,
  },
];

describe('region-tree', () => {
  it('builds forest with orphans as roots and sorted children', () => {
    const forest = buildRegionForest(sample);
    assert.equal(forest.length, 2);
    assert.equal(forest[0]?.region.name, 'Deutschland');
    assert.equal(forest[1]?.region.name, 'Orphan');
    const wil = forest[0]?.children[0]?.children[0]?.children[0];
    assert.equal(wil?.region.name, 'Willingshausen');
    assert.deepEqual(
      wil?.children.map((c) => c.region.name),
      ['Merzhausen', 'Wasenberg'],
    );
  });

  it('defaults expand country/state/district only', () => {
    const expanded = defaultExpandedIds(sample);
    assert.ok(expanded.has('de'));
    assert.ok(expanded.has('he'));
    assert.ok(expanded.has('sek'));
    assert.equal(expanded.has('wil'), false);
  });

  it('flattens with expand state', () => {
    const forest = buildRegionForest(sample);
    const rows = flattenVisible(forest, new Set(['de', 'he', 'sek']));
    assert.deepEqual(
      rows.map((r) => `${r.depth}:${r.region.name}`),
      ['0:Deutschland', '1:Hessen', '2:Schwalm-Eder-Kreis', '3:Willingshausen', '0:Orphan'],
    );
  });

  it('filter keeps ancestors and highlights match', () => {
    const forest = buildRegionForest(sample);
    const rows = flattenVisible(forest, new Set(), { name: 'Merzhausen' });
    assert.deepEqual(
      rows.map((r) => `${r.region.name}:${r.matched}`),
      [
        'Deutschland:false',
        'Hessen:false',
        'Schwalm-Eder-Kreis:false',
        'Willingshausen:false',
        'Merzhausen:true',
      ],
    );
    assert.deepEqual(rows.at(-1)?.pathNames, [
      'Deutschland',
      'Hessen',
      'Schwalm-Eder-Kreis',
      'Willingshausen',
    ]);
  });

  it('collectExpandableIds and formatRegionPath', () => {
    const forest = buildRegionForest(sample);
    assert.ok(collectExpandableIds(forest).includes('wil'));
    assert.equal(formatRegionPath(['Hessen', 'SEK']), 'Hessen › SEK');
  });
});
