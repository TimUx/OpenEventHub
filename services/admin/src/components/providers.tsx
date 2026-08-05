'use client';

import type { Locale } from '@openeventhub/shared';
import type { ReactNode } from 'react';

import { AuthProvider } from './auth-provider';
import { I18nProvider } from '../i18n/i18n-provider';
import type { Dictionary } from '../i18n/get-dictionary';

export function Providers({
  children,
  locale,
  dictionary,
}: {
  readonly children: ReactNode;
  readonly locale: Locale;
  readonly dictionary: Dictionary;
}) {
  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <AuthProvider>{children}</AuthProvider>
    </I18nProvider>
  );
}
