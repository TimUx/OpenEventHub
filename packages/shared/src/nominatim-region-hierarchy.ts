/**
 * Map OpenStreetMap Nominatim search hits onto OpenEventHub region hierarchy
 * Land → Bundesland → Landkreis → Kommune → Ort.
 */

import { regionTypeRank } from './region-types.js';

export type RegionHierarchyType = 'country' | 'state' | 'district' | 'municipality' | 'suburb';

export type RegionHierarchyNode = {
  readonly type: RegionHierarchyType;
  readonly name: string;
  readonly isoCode: string | null;
};

export type NominatimAddress = {
  readonly country?: string;
  readonly country_code?: string;
  readonly state?: string;
  readonly 'ISO3166-2-lvl4'?: string;
  readonly county?: string;
  readonly state_district?: string;
  readonly municipality?: string;
  readonly city?: string;
  readonly town?: string;
  readonly village?: string;
  readonly hamlet?: string;
  readonly suburb?: string;
  readonly quarter?: string;
  readonly city_district?: string;
  readonly peak?: string;
  readonly [key: string]: string | undefined;
};

export type NominatimSearchHit = {
  readonly place_id?: number;
  readonly osm_type?: string;
  readonly osm_id?: number;
  readonly lat?: string;
  readonly lon?: string;
  readonly class?: string;
  readonly type?: string;
  readonly addresstype?: string;
  readonly name?: string;
  readonly display_name?: string;
  readonly address?: NominatimAddress;
};

export type RegionLookupCandidate = {
  /** Stable id: osm_type:osm_id or place_id fallback */
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly leafType: RegionHierarchyType;
  readonly chain: readonly RegionHierarchyNode[];
  readonly lat: number | null;
  readonly lon: number | null;
};

const PLACE_CLASSES = new Set(['place', 'boundary', 'highway']);
const REJECT_TYPES = new Set([
  'peak',
  'ridge',
  'cliff',
  'water',
  'river',
  'stream',
  'wood',
  'forest',
  'park',
  'parking',
]);

function cleanName(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function pickFirst(...values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const cleaned = cleanName(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Whether a Nominatim hit is a usable admin/settlement place (not peak/nature noise). */
export function isUsableNominatimPlaceHit(hit: NominatimSearchHit): boolean {
  const kind = (hit.type ?? hit.addresstype ?? '').toLowerCase();
  if (REJECT_TYPES.has(kind)) return false;
  if (hit.class && !PLACE_CLASSES.has(hit.class) && hit.class !== 'amenity') {
    // Still allow administrative boundaries
    if (hit.class !== 'boundary') return false;
  }
  if (!hit.address && !hit.name) return false;
  return true;
}

/**
 * Build Land→…→Ort chain from a Nominatim address payload.
 * Missing intermediate levels are omitted (e.g. Stadtstaaten without Landkreis).
 */
export function buildRegionHierarchyFromNominatim(hit: NominatimSearchHit): RegionHierarchyNode[] {
  const address = hit.address ?? {};
  const chain: RegionHierarchyNode[] = [];

  const country = pickFirst(address.country);
  if (country) {
    chain.push({
      type: 'country',
      name: country,
      isoCode: address.country_code ? address.country_code.toUpperCase() : null,
    });
  }

  const state = pickFirst(address.state);
  if (state) {
    chain.push({
      type: 'state',
      name: state,
      isoCode: pickFirst(address['ISO3166-2-lvl4']),
    });
  }

  const district = pickFirst(address.county, address.state_district);
  if (district) {
    chain.push({ type: 'district', name: district, isoCode: null });
  }

  const municipality = pickFirst(address.municipality, address.city, address.town);
  const place = pickFirst(
    address.village,
    address.hamlet,
    address.suburb,
    address.quarter,
    address.city_district,
  );
  const named = pickFirst(hit.name);

  const addresstype = (hit.addresstype ?? hit.type ?? '').toLowerCase();
  const leafIsSettlementOrt =
    ['village', 'hamlet', 'suburb', 'neighbourhood', 'quarter', 'locality'].includes(addresstype) ||
    Boolean(place && municipality && !sameName(place, municipality));

  if (municipality && place && !sameName(municipality, place) && leafIsSettlementOrt) {
    chain.push({ type: 'municipality', name: municipality, isoCode: null });
    chain.push({ type: 'suburb', name: place, isoCode: null });
  } else if (municipality && named && !sameName(municipality, named) && leafIsSettlementOrt) {
    chain.push({ type: 'municipality', name: municipality, isoCode: null });
    chain.push({ type: 'suburb', name: named, isoCode: null });
  } else if (municipality) {
    chain.push({ type: 'municipality', name: municipality, isoCode: null });
  } else if (place) {
    chain.push({ type: 'suburb', name: place, isoCode: null });
  } else if (named) {
    // Fallback: classify by addresstype
    if (['state', 'country'].includes(addresstype)) {
      // already covered
    } else if (['county', 'state_district'].includes(addresstype)) {
      if (!district) chain.push({ type: 'district', name: named, isoCode: null });
    } else if (['city', 'town', 'municipality', 'administrative'].includes(addresstype)) {
      chain.push({ type: 'municipality', name: named, isoCode: null });
    } else {
      chain.push({ type: 'suburb', name: named, isoCode: null });
    }
  }

  // De-dupe consecutive same name/type and ensure ascending ranks
  const deduped: RegionHierarchyNode[] = [];
  for (const node of chain) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.type === node.type && sameName(prev.name, node.name)) continue;
    if (prev && regionTypeRank(node.type) < regionTypeRank(prev.type)) continue;
    deduped.push(node);
  }
  return deduped;
}

export function candidateIdFromNominatim(hit: NominatimSearchHit): string {
  if (hit.osm_type && hit.osm_id != null) {
    return `${hit.osm_type}:${hit.osm_id}`;
  }
  if (hit.place_id != null) {
    return `place:${hit.place_id}`;
  }
  return `name:${(hit.display_name ?? hit.name ?? 'unknown').slice(0, 120)}`;
}

export function toRegionLookupCandidate(hit: NominatimSearchHit): RegionLookupCandidate | null {
  if (!isUsableNominatimPlaceHit(hit)) return null;
  const chain = buildRegionHierarchyFromNominatim(hit);
  if (chain.length === 0) return null;
  const leaf = chain[chain.length - 1]!;
  const lat = hit.lat != null ? Number(hit.lat) : null;
  const lon = hit.lon != null ? Number(hit.lon) : null;
  return {
    id: candidateIdFromNominatim(hit),
    label: hit.display_name?.trim() || chain.map((n) => n.name).join(' › '),
    name: leaf.name,
    leafType: leaf.type,
    chain,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

/** Deduplicate candidates that resolve to the same hierarchy path. */
export function uniqueRegionLookupCandidates(
  candidates: readonly RegionLookupCandidate[],
): RegionLookupCandidate[] {
  const seen = new Set<string>();
  const out: RegionLookupCandidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.chain.map((n) => `${n.type}:${n.name.toLowerCase()}`).join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
  }
  return out;
}
