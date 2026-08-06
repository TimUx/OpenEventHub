'use client';

import { Check, Moon, Palette, Sun } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { useI18n } from '../i18n/i18n-provider';
import {
  ACCENT_THEMES,
  type AccentId,
  applyAccentToDocument,
  applyThemeModeToDocument,
  getAccentTheme,
  persistAccent,
  persistThemeMode,
  readStoredAccent,
  readStoredDarkMode,
} from '../lib/accent-theme';
import { cn } from '../lib/utils';

const iconButtonClass =
  'inline-flex h-11 min-h-tap min-w-11 items-center justify-center rounded-xl text-primary-contrast transition-colors hover:bg-primary-contrast/15';

export function AppearanceControls({
  className,
  showThemeToggle = true,
}: {
  readonly className?: string;
  readonly showThemeToggle?: boolean;
}) {
  const { t } = useI18n();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState<AccentId>('blue');
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const nextDark = readStoredDarkMode();
    const nextAccent = readStoredAccent();
    setDark(nextDark);
    setAccent(nextAccent);
    applyThemeModeToDocument(nextDark);
    applyAccentToDocument(nextAccent);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    applyThemeModeToDocument(next);
    persistThemeMode(next);
  }

  function selectAccent(next: AccentId) {
    setAccent(next);
    applyAccentToDocument(next);
    persistAccent(next);
    setOpen(false);
  }

  const current = getAccentTheme(ready ? accent : 'blue');

  return (
    <div ref={rootRef} className={cn('relative flex items-center gap-0.5', className)}>
      <button
        type="button"
        className={iconButtonClass}
        aria-label={`${t('nav.accentColor')}: ${t(`nav.accent.${current.id}`)}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        title={t(`nav.accent.${current.id}`)}
        onClick={() => setOpen((value) => !value)}
      >
        <Palette className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('nav.accentColor')}
          className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 text-[var(--foreground)] shadow-soft"
        >
          {ACCENT_THEMES.map((theme) => {
            const selected = ready && accent === theme.id;
            return (
              <li key={theme.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex w-full min-h-tap items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors',
                    selected
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'hover:bg-[var(--background)]',
                  )}
                  onClick={() => selectAccent(theme.id)}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: theme.swatch }}
                    aria-hidden
                  />
                  <span className="flex-1">{t(`nav.accent.${theme.id}`)}</span>
                  {selected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-primary"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : (
                    <span className="h-4 w-4 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {showThemeToggle ? (
        <button
          type="button"
          className={iconButtonClass}
          aria-label={dark ? t('nav.lightMode') : t('nav.darkMode')}
          onClick={toggleTheme}
        >
          {dark ? (
            <Sun className="h-4 w-4" strokeWidth={2} aria-hidden />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={2} aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
