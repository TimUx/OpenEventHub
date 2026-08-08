/**
 * Curated default event categories for rural / small-town Germany.
 * Seeded on fresh install (`db:seed`); operators extend the catalog in Admin.
 * AI taxonomy matching shares this list — AI does not invent new categories.
 */

export type DefaultEventCategory = {
  readonly slug: string;
  readonly name: string;
  /** Extra match keys (lowercase ok); name + slug are always matched too. */
  readonly aliases: readonly string[];
};

export const DEFAULT_EVENT_CATEGORIES: readonly DefaultEventCategory[] = [
  {
    slug: 'kirmes',
    name: 'Kirmes',
    aliases: ['kirchweih', 'traditionskirmes', 'kerwe', 'kermis', 'volksfest'],
  },
  {
    slug: 'schuetzenfest',
    name: 'Schützenfest',
    aliases: ['schuetzenfest', 'schützen', 'schuetzen'],
  },
  {
    slug: 'dorffest',
    name: 'Dorffest',
    aliases: [
      'ortsfest',
      'gemeindefest',
      'fest',
      'festival',
      'folk festival',
      'beer festival',
      'weinfest',
      'weindorf',
      'grill',
      'gasthof',
    ],
  },
  {
    slug: 'konzert',
    name: 'Konzert',
    aliases: [
      'concert',
      'concerts',
      'music',
      'musik',
      'music festival',
      'live music',
      'performance',
    ],
  },
  {
    slug: 'tag-der-offenen-tuer',
    name: 'Tag der Offenen Tür',
    aliases: ['tag der offenen tür', 'open day', 'open house', 'tdot'],
  },
  {
    slug: 'sportveranstaltung',
    name: 'Sportveranstaltung',
    aliases: [
      'sport',
      'sports',
      'tournament',
      'lauf',
      'running',
      'cycling',
      'hiking',
      'wandern',
      'fußball',
      'football',
      'motorradtreffen',
    ],
  },
  {
    slug: 'vereinsveranstaltung',
    name: 'Vereinsveranstaltung',
    aliases: ['verein', 'meeting', 'versammlung', 'club', 'organization', 'social gathering'],
  },
  {
    slug: 'markt',
    name: 'Markt',
    aliases: ['market', 'jahrmarkt', 'wochenmarkt', 'flohmarkt', 'scherzmarkt', 'fair'],
  },
  {
    slug: 'feuerwehrfest',
    name: 'Feuerwehrfest',
    aliases: ['feuerwehr', 'fire brigade', 'fire', 'bonfire', 'fireworks'],
  },
  {
    slug: 'theater',
    name: 'Theater',
    aliases: ['theatre', 'kultur', 'culture', 'ausstellung', 'exhibition', 'exhibitions'],
  },
  {
    slug: 'weihnachtsmarkt',
    name: 'Weihnachtsmarkt',
    aliases: ['christkindlmarkt', 'christmas market'],
  },
  {
    slug: 'sonstiges',
    name: 'Sonstiges',
    aliases: [
      'other',
      'event',
      'outdoor event',
      'party',
      'celebration',
      'recreation',
      'tourism',
      'incident',
      'conference',
    ],
  },
] as const;

export const DEFAULT_CATEGORY_SLUGS: ReadonlySet<string> = new Set(
  DEFAULT_EVENT_CATEGORIES.map((c) => c.slug),
);

/** Normalize for alias matching: lowercase, fold umlauts, collapse punctuation. */
export function normalizeCategoryKey(value: string): string {
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
 * Map a free-form label (DE/EN) onto a curated category slug, or null if unknown.
 * Prefer specific matches over `sonstiges`.
 */
export function resolveDefaultCategorySlug(label: string): string | null {
  const key = normalizeCategoryKey(label);
  if (!key) return null;

  let fallback: string | null = null;
  for (const category of DEFAULT_EVENT_CATEGORIES) {
    const keys = [
      normalizeCategoryKey(category.slug),
      normalizeCategoryKey(category.name),
      ...category.aliases.map(normalizeCategoryKey),
    ];
    if (!keys.includes(key)) continue;
    if (category.slug === 'sonstiges') {
      fallback = category.slug;
      continue;
    }
    return category.slug;
  }
  return fallback;
}
