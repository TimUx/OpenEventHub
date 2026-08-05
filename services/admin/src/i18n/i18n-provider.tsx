'use client';

import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from '@openeventhub/shared';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';

import { translate, type Dictionary } from './get-dictionary';

type I18nContextValue = {
  readonly locale: Locale;
  readonly dictionary: Dictionary;
  readonly t: (key: string, vars?: Record<string, string | number>) => string;
  readonly setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function writeLocaleCookie(locale: Locale): void {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  readonly locale: Locale;
  readonly dictionary: Dictionary;
  readonly children: ReactNode;
}) {
  const setLocale = useCallback((next: Locale) => {
    if (!SUPPORTED_LOCALES.includes(next)) {
      return;
    }
    writeLocaleCookie(next);
    window.location.reload();
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dictionary,
      t: (key, vars) => translate(dictionary, key, vars),
      setLocale,
    }),
    [dictionary, locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
