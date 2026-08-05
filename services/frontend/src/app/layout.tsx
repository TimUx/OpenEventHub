import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';
import { SiteHeader } from '../components/site-header';
import { getDictionary } from '../i18n/get-dictionary';
import { getRequestLocale } from '../i18n/request-locale';
import { getSiteUrl } from '../lib/api';
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
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: 'OpenEventHub',
      template: '%s · OpenEventHub',
    },
    description: dictionary.meta.description,
    openGraph: {
      type: 'website',
      siteName: 'OpenEventHub',
      title: 'OpenEventHub',
      description: dictionary.meta.ogDescription,
      locale: locale === 'de' ? 'de_DE' : 'en_GB',
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning className={sans.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('oeh-theme');if(t==='dark')document.documentElement.classList.add('dark');var a=localStorage.getItem('oeh-accent');var ok=['blue','teal','green','navy','orange','crimson','slate'];if(a&&ok.indexOf(a)!==-1)document.documentElement.dataset.accent=a;else document.documentElement.dataset.accent='blue';}catch(e){document.documentElement.dataset.accent='blue';}})();`,
          }}
        />
      </head>
      <body>
        <Providers locale={locale} dictionary={dictionary}>
          <SiteHeader />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8">{children}</main>
          <footer className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-[var(--muted)]">
            {dictionary.footer}
          </footer>
        </Providers>
      </body>
    </html>
  );
}
