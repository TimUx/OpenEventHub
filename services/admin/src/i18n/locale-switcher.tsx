'use client';

import type { Locale } from '@openeventhub/shared';

import { useI18n } from './i18n-provider';
import { cn } from '../lib/utils';

export function LocaleSwitcher({
  className,
  variant = 'default',
}: {
  readonly className?: string;
  readonly variant?: 'default' | 'onPrimary';
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <span className="sr-only">{t('nav.language')}</span>
      <select
        className={cn(
          'h-9 rounded-xl border px-2 text-sm font-semibold',
          // Solid light control: native <option> lists ignore translucent/white text
          // and become unreadable on system dropdown backgrounds.
          variant === 'onPrimary'
            ? 'border-white/50 bg-white text-primary'
            : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]',
        )}
        value={locale}
        aria-label={t('nav.language')}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="de" className="bg-white text-[var(--foreground)]">
          DE
        </option>
        <option value="en" className="bg-white text-[var(--foreground)]">
          EN
        </option>
      </select>
    </label>
  );
}
