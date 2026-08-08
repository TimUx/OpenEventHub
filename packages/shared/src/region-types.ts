/**
 * Geographic hierarchy ranks and UI labels for RegionType.
 * Land → Bundesland → Landkreis → Kommune → Ort
 *
 * DB enum keeps `municipality` / `city` / `suburb` for compatibility:
 * - municipality + city → Kommune
 * - suburb → Ort
 */

export const REGION_TYPE_RANK: Readonly<Record<string, number>> = {
  country: 0,
  state: 1,
  district: 2,
  municipality: 3,
  city: 3,
  suburb: 4,
};

/** Canonical display group for filters (city shares Kommune with municipality). */
export function regionTypeGroupKey(type: string): string {
  if (type === 'city') return 'municipality';
  return type;
}

export function regionTypeRank(type: string): number {
  return REGION_TYPE_RANK[type] ?? 50;
}
