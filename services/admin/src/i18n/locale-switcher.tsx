'use client';

import type { Locale } from '@openeventhub/shared';
import { Languages } from 'lucide-react';

import { useI18n } from './i18n-provider';
import { cn } from '../lib/utils';

const LOCALES: readonly Locale[] = ['de', 'en'];

export function LocaleSwitcher({
  className,
  variant = 'default',
}: {
  readonly className?: string;
  readonly variant?: 'default' | 'onPrimary';
}) {
  const { locale, setLocale, t } = useI18n();
  const next = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length] ?? 'en';

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 min-h-tap min-w-11 items-center justify-center rounded-xl transition-colors',
        variant === 'onPrimary'
          ? 'text-primary-contrast hover:bg-primary-contrast/15'
          : 'text-[var(--foreground)] hover:bg-[var(--background)]',
        className,
      )}
      aria-label={`${t('nav.language')}: ${locale.toUpperCase()} → ${next.toUpperCase()}`}
      title={`${locale.toUpperCase()} → ${next.toUpperCase()}`}
      onClick={() => setLocale(next)}
    >
      <Languages className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  );
}
