import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '../components/providers';
import { SiteHeader } from '../components/site-header';
import { getSiteUrl } from '../lib/api';
import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'OpenEventHub',
    template: '%s · OpenEventHub',
  },
  description: 'AI-powered Event Intelligence Platform — discover and follow regional events.',
  openGraph: {
    type: 'website',
    siteName: 'OpenEventHub',
    title: 'OpenEventHub',
    description: 'AI-powered Event Intelligence Platform',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
      <body>
        <Providers>
          <SiteHeader />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-8">{children}</main>
          <footer className="border-t border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            OpenEventHub — Event Intelligence, not just a calendar.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
