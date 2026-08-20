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

/** Nominatim classes/types that may become Region nodes on AI ingest. */
const SETTLEMENT_CLASSES = new Set(['place', 'boundary']);
const SETTLEMENT_TYPES = new Set([
  'administrative',
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'suburb',
  'neighbourhood',
  'neighborhood',
  'quarter',
  'locality',
  'city_district',
  'borough',
  'county',
  'state',
  'state_district',
  'country',
]);

/** Compound POIs (`Schlosskirche`) + common venue nouns — must not become Region leaves. */
const VENUE_OR_POI_TOKEN_CORE =
  '\\w*kirche|parkplatz|wanderparkplatz|burgruine|museum|bahnhof|saal|halle|gasthof|gasthaus|hotel|schule|kindergarten|friedhof|sportplatz|festplatz|marktplatz|rathaus|schloss|kloster|kapelle|arena|stadion|theater|kino|bibliothek|buergerhaus|bürgerhaus';

const VENUE_OR_POI_TOKEN = new RegExp(`\\b(?:${VENUE_OR_POI_TOKEN_CORE})\\b`, 'i');

const LEADING_BEFORE_VENUE = new RegExp(
  `\\b\\S+\\s+(?=(?:${VENUE_OR_POI_TOKEN_CORE})\\b)`,
  'gi',
);

const STREET_ADDRESS =
  /\b(\d{1,4}[a-z]?)\b.*\b(str(asse|\.)?|weg|gasse|allee|platz|ring|damm)\b|\b(str(asse|\.)?|weg|gasse|allee|platz|ring|damm)\b.+\b\d{1,4}[a-z]?\b/i;

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

function normalizePlaceKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Labels that must not become Region nodes (venues, halls, street addresses).
 * Used before Nominatim on AI ingest.
 */
export function looksLikeVenueOrAddressLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (VENUE_OR_POI_TOKEN.test(trimmed)) return true;
  if (STREET_ADDRESS.test(trimmed)) return true;
  // "Zella Blauer Saal" / comma-separated address lines
  if (/,/.test(trimmed) && /\d/.test(trimmed)) return true;
  return false;
}

/**
 * Prefer the settlement fragment of a polluted label for catalog/Nominatim lookup.
 * Returns null when nothing settlement-like remains.
 */
export function settlementQueryFromLabel(label: string): string | null {
  const trimmed = label.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;

  // "Waßmuthshäuser Straße 15, Homberg (Efze)" → last comma segment
  if (trimmed.includes(',')) {
    const parts = trimmed
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const part = parts[i]!;
      if (looksLikeVenueOrAddressLabel(part) && STREET_ADDRESS.test(part)) continue;
      if (!STREET_ADDRESS.test(part) && !VENUE_OR_POI_TOKEN.test(part)) {
        // Strip leading ZIP
        const withoutZip = part.replace(/^\d{5}\s+/, '').trim();
        if (withoutZip.length >= 2) return withoutZip;
      }
    }
  }

  if (!looksLikeVenueOrAddressLabel(trimmed)) {
    return trimmed;
  }

  // "Zella Blauer Saal" → drop adjective before venue noun, then venue tokens
  // "Stadtkirche Treysa" / "Schlosskirche Ziegenhain" → drop compound *kirche, keep settlement
  const withoutVenue = trimmed
    .replace(LEADING_BEFORE_VENUE, ' ')
    .replace(VENUE_OR_POI_TOKEN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutVenue.length >= 2 && !looksLikeVenueOrAddressLabel(withoutVenue)) {
    return withoutVenue;
  }
  return null;
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
 * Stricter gate for AI ingest: only settlement / administrative place hits.
 * Rejects amenity/building/tourism/parking/highway POIs (church, parking, ruins, …).
 */
export function isSettlementOrAdminNominatimHit(hit: NominatimSearchHit): boolean {
  if (!isUsableNominatimPlaceHit(hit)) return false;
  const klass = (hit.class ?? '').toLowerCase();
  if (klass && !SETTLEMENT_CLASSES.has(klass)) return false;
  const kind = (hit.type ?? hit.addresstype ?? '').toLowerCase();
  if (kind && !SETTLEMENT_TYPES.has(kind) && klass !== 'boundary') return false;
  if (hit.name && looksLikeVenueOrAddressLabel(hit.name)) return false;
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

/** Like toRegionLookupCandidate but only for settlement/admin hits (AI ingest). */
export function toSettlementRegionLookupCandidate(
  hit: NominatimSearchHit,
): RegionLookupCandidate | null {
  if (!isSettlementOrAdminNominatimHit(hit)) return null;
  return toRegionLookupCandidate(hit);
}

function leafMatchesQuery(candidate: RegionLookupCandidate, queryKey: string): boolean {
  if (!queryKey) return false;
  const leafKey = normalizePlaceKey(candidate.name);
  if (leafKey === queryKey || leafKey.includes(queryKey) || queryKey.includes(leafKey)) {
    return true;
  }
  return candidate.chain.some((node) => {
    const key = normalizePlaceKey(node.name);
    return key === queryKey || key.includes(queryKey) || queryKey.includes(key);
  });
}

/**
 * Pick the best settlement candidate for AI ingest.
 * Prefers leaf/chain names matching the query; for street-like queries prefers municipality leaves.
 */
export function pickBestSettlementCandidate(
  hits: readonly NominatimSearchHit[],
  query: string,
): RegionLookupCandidate | null {
  const settlementQuery = settlementQueryFromLabel(query) ?? query.trim();
  if (settlementQuery.length < 2) return null;
  const queryKey = normalizePlaceKey(settlementQuery);
  const preferMunicipality = looksLikeVenueOrAddressLabel(query) || STREET_ADDRESS.test(query);

  const candidates = uniqueRegionLookupCandidates(
    hits
      .map((hit) => toSettlementRegionLookupCandidate(hit))
      .filter((row): row is RegionLookupCandidate => row != null),
  ).filter((candidate) => leafMatchesQuery(candidate, queryKey));

  if (candidates.length === 0) return null;

  const scored = candidates.map((candidate) => {
    const leafKey = normalizePlaceKey(candidate.name);
    let score = 0;
    if (leafKey === queryKey) score += 100;
    else if (leafKey.includes(queryKey) || queryKey.includes(leafKey)) score += 40;
    if (preferMunicipality && candidate.leafType === 'municipality') score += 30;
    if (candidate.leafType === 'suburb' && !preferMunicipality) score += 20;
    if (candidate.leafType === 'district') score += 5;
    score += Math.min(candidate.chain.length, 5);
    return { candidate, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.candidate ?? null;
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
