import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ApiRegion } from './api.js';
import { buildRegionOptions, filterRegionOptions, findRegionOption } from './region-tree.js';

const sample: ApiRegion[] = [
  { id: 'de', name: 'Deutschland', slug: 'deutschland', type: 'country', parentId: null },
  { id: 'he', name: 'Hessen', slug: 'hessen', type: 'state', parentId: 'de' },
  { id: 'by', name: 'Bayern', slug: 'bayern', type: 'state', parentId: 'de' },
  {
    id: 'sek',
    name: 'Schwalm-Eder-Kreis',
    slug: 'schwalm-eder-kreis',
    type: 'district',
    parentId: 'he',
  },
  {
    id: 'wil',
    name: 'Willingshausen',
    slug: 'willingshausen',
    type: 'municipality',
    parentId: 'sek',
  },
  {
    id: 'mer',
    name: 'Merzhausen',
    slug: 'merzhausen',
    type: 'suburb',
    parentId: 'wil',
  },
];

describe('region-tree', () => {
  it('orders regions as a hierarchy with depth', () => {
    const options = buildRegionOptions(sample);
    assert.deepEqual(
      options.map((o) => ({ name: o.name, depth: o.depth, groupKey: o.groupKey })),
      [
        { name: 'Deutschland', depth: 0, groupKey: 'country' },
        { name: 'Bayern', depth: 1, groupKey: 'state' },
        { name: 'Hessen', depth: 1, groupKey: 'state' },
        { name: 'Schwalm-Eder-Kreis', depth: 2, groupKey: 'district' },
        { name: 'Willingshausen', depth: 3, groupKey: 'municipality' },
        { name: 'Merzhausen', depth: 4, groupKey: 'suburb' },
      ],
    );
    assert.equal(
      options.find((o) => o.id === 'mer')?.pathLabel,
      'Deutschland › Hessen › Schwalm-Eder-Kreis › Willingshausen',
    );
  });

  it('filters by name and ancestor path', () => {
    const options = buildRegionOptions(sample);
    assert.equal(filterRegionOptions(options, 'merz')[0]?.id, 'mer');
    assert.ok(filterRegionOptions(options, 'schwalm').some((o) => o.id === 'mer'));
    assert.equal(findRegionOption(options, 'he')?.name, 'Hessen');
  });
});
