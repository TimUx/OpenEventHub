import type { Metadata, Viewport } from 'next';
import { Roboto } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';
import { PwaRegister } from '../components/pwa-register';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1565c0' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1520' },
  ],
};

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
    applicationName: 'OpenEventHub',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'OpenEventHub',
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: '/brand/mark.svg', type: 'image/svg+xml' },
        { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
    },
    openGraph: {
      type: 'website',
      siteName: 'OpenEventHub',
      title: 'OpenEventHub',
      description: dictionary.meta.ogDescription,
      locale: locale === 'de' ? 'de_DE' : 'en_GB',
      images: [{ url: '/brand/mark.png', width: 512, height: 512, alt: 'OpenEventHub' }],
    },
    twitter: {
      card: 'summary',
      title: 'OpenEventHub',
      description: dictionary.meta.ogDescription,
      images: ['/brand/mark.png'],
    },
    robots: {
      index: true,
      follow: true,
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
      <body className="min-h-dvh">
        <Providers locale={locale} dictionary={dictionary}>
          <PwaRegister />
          <SiteHeader />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-6 sm:py-8">{children}</main>
          <footer className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-center text-sm text-[var(--muted)] lg:pb-6">
            {dictionary.footer}
          </footer>
        </Providers>
      </body>
    </html>
  );
}
