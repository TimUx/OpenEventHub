'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Locale } from '@openeventhub/shared';
import { useState, type ReactNode } from 'react';

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
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nProvider>
  );
}
