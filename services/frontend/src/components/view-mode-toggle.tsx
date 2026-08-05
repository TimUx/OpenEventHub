'use client';

import type { ReactNode } from 'react';

import { cn } from '../lib/utils';

export type ViewOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly icon?: ReactNode;
};

export function ViewModeToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  readonly value: T;
  readonly options: ReadonlyArray<ViewOption<T>>;
  readonly onChange: (value: T) => void;
  readonly label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-soft"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'inline-flex h-11 min-h-tap items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold transition-colors sm:px-4',
            value === option.value
              ? 'bg-primary text-primary-contrast'
              : 'text-[var(--muted)] hover:bg-primary-soft hover:text-primary',
          )}
        >
          {option.icon}
          <span className={option.icon ? 'sr-only sm:not-sr-only sm:inline' : undefined}>
            {option.label}
          </span>
        </button>
      ))}
    </div>
  );
}
