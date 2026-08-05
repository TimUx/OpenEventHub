import type { Locale } from '@openeventhub/shared';

import { de, type Dictionary } from './messages/de';
import { en } from './messages/en';

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = {
  de,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.de;
}

export function translate(
  dictionary: Dictionary,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  let current: unknown = dictionary;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof current !== 'string') {
    return key;
  }
  if (!vars) {
    return current;
  }
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    current,
  );
}
