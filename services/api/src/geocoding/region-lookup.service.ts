import { Injectable, Logger } from '@nestjs/common';
import { RegionRepository, RegionType } from '@openeventhub/database';
import {
  toRegionLookupCandidate,
  uniqueRegionLookupCandidates,
  type RegionHierarchyNode,
  type RegionLookupCandidate,
} from '@openeventhub/shared';
import type { Region } from '@prisma/client';

import { slugifyLabel } from '../admin/slugify.js';
import { NominatimClient } from './nominatim.client.js';

@Injectable()
export class RegionLookupService {
  private readonly logger = new Logger(RegionLookupService.name);
  private readonly nominatim = new NominatimClient();

  constructor(private readonly regions: RegionRepository) {}

  async lookup(query: string): Promise<{
    readonly query: string;
    readonly candidates: readonly RegionLookupCandidate[];
  }> {
    const q = query.trim();
    if (q.length < 2) {
      return { query: q, candidates: [] };
    }

    let hits;
    try {
      hits = await this.nominatim.searchGermany(q);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Nominatim lookup failed for ${JSON.stringify(q)}: ${message}`);
      throw err;
    }

    const candidates = uniqueRegionLookupCandidates(
      hits
        .map((hit) => toRegionLookupCandidate(hit))
        .filter((row): row is RegionLookupCandidate => row != null),
    );

    return { query: q, candidates };
  }

  /**
   * Find-or-create every node in the candidate chain (root → leaf).
   * Returns the created/reused regions in chain order and the leaf.
   */
  async createFromChain(chain: readonly RegionHierarchyNode[]): Promise<{
    readonly regions: Region[];
    readonly leaf: Region;
    readonly createdIds: string[];
  }> {
    if (chain.length === 0) {
      throw new Error('Empty hierarchy chain');
    }

    const regions: Region[] = [];
    const createdIds: string[] = [];
    let parentId: string | null = null;

    for (const node of chain) {
      const type = node.type as RegionType;
      const existing = await this.regions.findByNameTypeParent(node.name, type, parentId);
      if (existing) {
        regions.push(existing);
        parentId = existing.id;
        continue;
      }

      const baseSlug = slugifyLabel(node.name, type);
      const slug = await this.regions.allocateUniqueSlug(baseSlug);
      const created = await this.regions.create({
        name: node.name,
        slug,
        type,
        parentId,
        isoCode: node.isoCode,
      });
      createdIds.push(created.id);
      regions.push(created);
      parentId = created.id;
    }

    return {
      regions,
      leaf: regions[regions.length - 1]!,
      createdIds,
    };
  }
}
