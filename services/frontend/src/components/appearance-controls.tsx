'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useI18n } from '../i18n/i18n-provider';
import {
  ACCENT_THEMES,
  type AccentId,
  applyAccentToDocument,
  applyThemeModeToDocument,
  persistAccent,
  persistThemeMode,
  readStoredAccent,
  readStoredDarkMode,
} from '../lib/accent-theme';
import { cn } from '../lib/utils';

export function AppearanceControls({
  className,
  showThemeToggle = true,
}: {
  readonly className?: string;
  readonly showThemeToggle?: boolean;
}) {
  const { t } = useI18n();
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState<AccentId>('blue');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const nextDark = readStoredDarkMode();
    const nextAccent = readStoredAccent();
    setDark(nextDark);
    setAccent(nextAccent);
    applyThemeModeToDocument(nextDark);
    applyAccentToDocument(nextAccent);
    setReady(true);
  }, []);

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
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="radiogroup"
        aria-label={t('nav.accentColor')}
        className="flex items-center gap-1 rounded-xl border border-primary-contrast/30 bg-primary-contrast/10 p-1"
      >
        {ACCENT_THEMES.map((theme) => {
          const selected = ready && accent === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={t(`nav.accent.${theme.id}`)}
              title={t(`nav.accent.${theme.id}`)}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform',
                selected
                  ? 'scale-110 border-primary-contrast shadow-soft'
                  : 'border-primary-contrast/40 hover:scale-105',
              )}
              style={{ backgroundColor: theme.swatch }}
              onClick={() => selectAccent(theme.id)}
            />
          );
        })}
      </div>
      {showThemeToggle ? (
        <button
          type="button"
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl text-primary-contrast hover:bg-primary-contrast/15"
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
