'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, List, MapPinned, Moon, Search, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '../lib/utils';
import { Button } from './ui/button';

const links = [
  { href: '/events', label: 'Events', icon: List },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/map', label: 'Map', icon: MapPinned },
  { href: '/search', label: 'Search', icon: Search },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('oeh-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const enabled = stored ? stored === 'dark' : prefersDark;
    setDark(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem('oeh-theme', next ? 'dark' : 'light');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink dark:text-paper">
          OpenEventHub
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                pathname === href || pathname.startsWith(`${href}/`)
                  ? 'bg-teal/15 text-teal dark:text-teal-bright'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      <nav
        aria-label="Mobile"
        className="flex gap-1 overflow-x-auto border-t border-[var(--border)] px-2 py-2 md:hidden"
      >
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-sm',
              pathname === href ? 'bg-teal/15 text-teal' : 'text-[var(--muted)]',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
