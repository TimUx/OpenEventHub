import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  evaluateCategoryAllowlist,
  expandAllowlistCategoryIds,
} from './category-import-allowlist.js';

describe('category-import-allowlist', () => {
  const categories = [
    { id: 'culture', name: 'Culture', parentId: null },
    { id: 'kirmes', name: 'Kirmes', parentId: 'culture' },
    { id: 'markt', name: 'Markt', parentId: 'culture' },
    { id: 'sport', name: 'Sportveranstaltung', parentId: null },
    { id: 'lauf', name: 'Laufen', parentId: 'sport' },
    { id: 'konzert', name: 'Konzert', parentId: null },
  ];

  it('expands parent to all children', () => {
    const allowed = expandAllowlistCategoryIds(['culture'], categories);
    assert.ok(allowed.has('culture'));
    assert.ok(allowed.has('kirmes'));
    assert.ok(allowed.has('markt'));
    assert.equal(allowed.has('sport'), false);
  });

  it('allows all when allowlist is empty', () => {
    assert.equal(
      evaluateCategoryAllowlist({
        allowlistRootIds: [],
        categories,
        resolvedCategoryIds: ['konzert'],
      }).allowed,
      true,
    );
  });

  it('allows unknown category when nothing resolved', () => {
    assert.equal(
      evaluateCategoryAllowlist({
        allowlistRootIds: ['kirmes'],
        categories,
        resolvedCategoryIds: [],
      }).reason,
      'category_unknown',
    );
  });

  it('allows child when parent is selected', () => {
    assert.equal(
      evaluateCategoryAllowlist({
        allowlistRootIds: ['culture'],
        categories,
        resolvedCategoryIds: ['kirmes'],
      }).allowed,
      true,
    );
  });

  it('rejects known category outside allowlist', () => {
    assert.equal(
      evaluateCategoryAllowlist({
        allowlistRootIds: ['kirmes', 'markt'],
        categories,
        resolvedCategoryIds: ['konzert'],
      }).allowed,
      false,
    );
  });

  it('allows when any resolved id intersects allowlist', () => {
    assert.equal(
      evaluateCategoryAllowlist({
        allowlistRootIds: ['kirmes'],
        categories,
        resolvedCategoryIds: ['konzert', 'kirmes'],
      }).allowed,
      true,
    );
  });
});
