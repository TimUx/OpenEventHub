/**
 * Locale resolution for OpenEventHub UIs.
 * Order: explicit preference → Accept-Language / navigator → default `de`.
 */

export const SUPPORTED_LOCALES = ['de', 'en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'de';

export const LOCALE_COOKIE = 'oeh_locale';

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'de' || value === 'en';
}

/**
 * Parse an Accept-Language header into ordered language tags (lowercase).
 */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header || !header.trim()) {
    return [];
  }

  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: (tag ?? '').trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

function matchSupported(tag: string): Locale | null {
  const base = tag.split('-')[0] ?? tag;
  if (isLocale(base)) {
    return base;
  }
  return null;
}

/**
 * Resolve UI locale from optional cookie preference and Accept-Language.
 * Defaults to German when nothing matches.
 */
export function resolveLocale(options: {
  readonly cookieLocale?: string | null;
  readonly acceptLanguage?: string | null;
  readonly navigatorLanguages?: readonly string[] | null;
}): Locale {
  if (isLocale(options.cookieLocale ?? null)) {
    return options.cookieLocale as Locale;
  }

  for (const tag of parseAcceptLanguage(options.acceptLanguage)) {
    const matched = matchSupported(tag);
    if (matched) {
      return matched;
    }
  }

  for (const tag of options.navigatorLanguages ?? []) {
    const matched = matchSupported(tag.toLowerCase());
    if (matched) {
      return matched;
    }
  }

  return DEFAULT_LOCALE;
}

/** BCP 47 tag for Intl formatters. */
export function intlLocale(locale: Locale): string {
  return locale === 'de' ? 'de-DE' : 'en-GB';
}
