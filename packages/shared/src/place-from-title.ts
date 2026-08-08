/**
 * Infer a place/town name from German-style event titles when no venue is given.
 * Typical brewery/village calendars: "Kirmes Niedergrenzebach", "Scherzmarkt in Treysa".
 */

const EVENT_KEYWORDS = new Set(
  [
    'kirmes',
    'huettenkirmes',
    'hüttenkirmes',
    'traditionskirmes',
    'markt',
    'scherzmarkt',
    'weihnachtsmarkt',
    'ostermarkt',
    'flohmarkt',
    'weindorf',
    'bierdorf',
    'jahrfeier',
    'jubilaeum',
    'jubiläum',
    'feier',
    'fest',
    'festival',
    'party',
    'konzert',
    'messe',
    'wochenende',
    'nacht',
    'tag',
    'tage',
    'historisches',
    'historische',
  ].map(normalizeKey),
);

const FILLER = new Set(['und', 'am', 'im', 'der', 'die', 'das', 'dem', 'den', 'zum', 'zur', 'fuer', 'für', 'mit', 'vom', 'von']);

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isEventKeyword(token: string): boolean {
  return EVENT_KEYWORDS.has(normalizeKey(token));
}

function isFiller(token: string): boolean {
  return FILLER.has(normalizeKey(token));
}

function looksLikePlaceToken(token: string): boolean {
  if (token.length < 3 || isEventKeyword(token) || isFiller(token) || /^\d+$/.test(token)) {
    return false;
  }
  // German place names in titles are usually capitalized.
  return /^[A-ZÄÖÜ]/.test(token);
}

/**
 * Convert common German adjectival place forms used in titles (Merzhäuser → Merzhausen).
 */
export function demotePlaceAdjective(token: string): string {
  if (/häuser$/i.test(token)) {
    return token.replace(/häuser$/i, 'hausen');
  }
  if (/hauser$/i.test(token) && !/hausen$/i.test(token)) {
    return token.replace(/hauser$/i, 'hausen');
  }
  return token;
}

/**
 * Returns a place candidate from the title, or null when none can be inferred safely.
 */
export function inferPlaceFromTitle(title: string | null | undefined): string | null {
  const raw = title?.trim();
  if (!raw) return null;

  // Prefer the main clause before an em/en dash subtitle.
  const head = raw.split(/\s*[—–]\s*/)[0]!.trim();
  if (!head) return null;

  // "Scherzmarkt in Treysa", "Konzert in Homberg"
  const inPlace = /\bin\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]+)\b/u.exec(head);
  if (inPlace?.[1] && looksLikePlaceToken(inPlace[1])) {
    return demotePlaceAdjective(inPlace[1]);
  }

  const tokens = head
    .replace(/^\d+\.?\s+/, '')
    .split(/\s+/)
    .map((t) => t.replace(/^[,.;:]+|[,.;:]+$/g, ''))
    .filter(Boolean);

  if (tokens.length < 2) return null;

  const eventIdx = tokens.findIndex((t) => isEventKeyword(t));
  if (eventIdx === -1) return null;

  if (eventIdx === 0) {
    // EventType + Place… → "Kirmes Niedergrenzebach", "Weindorf Hundshausen"
    const after = tokens.slice(1).filter((t) => looksLikePlaceToken(t));
    if (after.length === 0) return null;
    return demotePlaceAdjective(after[after.length - 1]!);
  }

  // Place… + EventType → "Hauptschwenda Kirmes", "Merzhäuser Traditionskirmes"
  const before = tokens.slice(0, eventIdx).filter((t) => looksLikePlaceToken(t));
  if (before.length === 0) return null;
  return demotePlaceAdjective(before[before.length - 1]!);
}
