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
          variant === 'onPrimary'
            ? 'border-primary-contrast/30 bg-primary-contrast/10 text-primary-contrast'
            : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]',
        )}
        value={locale}
        aria-label={t('nav.language')}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="de">DE</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
