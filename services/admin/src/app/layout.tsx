import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'OpenEventHub Admin',
  description: 'OpenEventHub administration center',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <header
          style={{
            display: 'flex',
            gap: '1rem',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid #d9cbb3',
            background: '#f7f3ea',
            fontFamily: 'Georgia, serif',
          }}
        >
          <Link href="/">Dashboard</Link>
          <Link href="/ai-settings">AI Settings</Link>
        </header>
        {children}
      </body>
    </html>
  );
}
