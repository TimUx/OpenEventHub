/**
 * Normalize venue locality (building) and street address so Ort lives on Region,
 * not duplicated in Venue.name / Venue.address.
 */

import {
  looksLikeVenueOrAddressLabel,
  settlementQueryFromLabel,
} from './nominatim-region-hierarchy.js';

const COUNTRY_ONLY = /^(de|deu|deutschland|germany)$/i;
const ZIP_CITY = /^\d{5}(\s|$)/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Keep the street / square line; drop ZIP+town, country, and redundant settlement.
 * `Paradeplatz, 34613 Ziegenhain-Schwalmstadt, DE` → `Paradeplatz`
 * `Bahnhofstraße 32, 34582 Borken (Hessen)` → `Bahnhofstraße 32`
 */
export function streetLineFromAddress(address: string | null | undefined): string | null {
  let trimmed = address?.trim().replace(/\s+/g, ' ') ?? '';
  if (!trimmed) return null;

  trimmed = trimmed.replace(/,\s*(de|deu|deutschland|germany)\s*$/i, '').trim();

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const kept: string[] = [];
  for (const part of parts) {
    if (COUNTRY_ONLY.test(part)) continue;
    if (ZIP_CITY.test(part)) continue;
    kept.push(part);
  }

  if (kept.length === 0) return null;

  let street = kept[0]!;
  // "Paradeplatz 34613 Ziegenhain" (no commas)
  street = street.replace(/\s+\d{5}\b.*$/u, '').trim();
  return street.length >= 2 ? street : null;
}

function stripTrailingSettlement(label: string, settlement: string): string {
  const esc = escapeRegExp(settlement);
  let out = label
    .replace(new RegExp(`\\s*\\(${esc}\\)\\s*$`, 'i'), '')
    .replace(new RegExp(`\\s*[-–]\\s*${esc}\\s*$`, 'i'), '')
    .replace(new RegExp(`\\s+${esc}\\s*$`, 'i'), '')
    .trim();
  out = out.replace(/\s*\((?:hessen|deutschland|germany)\)\s*$/i, '').trim();
  return out.length >= 2 ? out : label;
}

/**
 * Prefer building/site name without trailing settlement (Ort belongs on Region).
 * - With region/classification hint: strip that settlement when it trails the label.
 * - Without hint: only compound `*kirche` labels (e.g. Schlosskirche Ziegenhain → Schlosskirche).
 *   Never strip arbitrary venue nouns (Museum der Schwalm, Gasthaus Simmen, Schloss Hirschgarten).
 */
export function buildingLocalityFromLabel(
  label: string | null | undefined,
  settlementHint?: string | null,
): string | null {
  const trimmed = label?.trim().replace(/\s+/g, ' ') ?? '';
  if (!trimmed) return null;

  const hint = settlementHint?.trim() || null;
  if (hint && hint.length >= 2) {
    const out = stripTrailingSettlement(trimmed, hint);
    if (out.toLowerCase() !== trimmed.toLowerCase()) return out;
  }

  const firstToken = trimmed.split(/\s+/)[0] ?? '';
  if (/\w*kirche$/i.test(firstToken) && looksLikeVenueOrAddressLabel(trimmed)) {
    const settlement = settlementQueryFromLabel(trimmed);
    if (settlement && settlement.length >= 2 && !/^(der|die|das|den|dem|des)\b/i.test(settlement)) {
      const out = stripTrailingSettlement(trimmed, settlement);
      if (out.toLowerCase() !== trimmed.toLowerCase()) return out;
    }
  }

  return trimmed;
}

/** Normalize both fields for DB persist (ingest, admin, repair). */
export function normalizeVenueFields(input: {
  readonly name: string | null | undefined;
  readonly address: string | null | undefined;
  readonly settlementHint?: string | null;
}): { name: string | null; address: string | null } {
  return {
    name: buildingLocalityFromLabel(input.name, input.settlementHint),
    address: streetLineFromAddress(input.address),
  };
}
