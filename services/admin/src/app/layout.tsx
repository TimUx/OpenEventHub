import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import { AdminShell } from '../components/admin-shell';
import { Providers } from '../components/providers';
import { getDictionary } from '../i18n/get-dictionary';
import { getRequestLocale } from '../i18n/request-locale';
import './globals.css';

const sans = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);
  return {
    title: {
      default: 'OpenEventHub Admin',
      template: '%s · Admin',
    },
    description: dictionary.meta.description,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale} className={sans.variable}>
      <body>
        <Providers locale={locale} dictionary={dictionary}>
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
