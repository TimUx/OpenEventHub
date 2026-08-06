'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { cn } from '../lib/utils';

/**
 * Compact disclosure for secondary tools (filters, calendar export).
 * Collapsed by default so primary content stays in focus.
 */
export function CollapsiblePanel({
  title,
  badge,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
}: {
  readonly title: string;
  readonly badge?: string;
  readonly defaultOpen?: boolean;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolled;
  const panelId = useId();

  function setOpen(next: boolean): void {
    onOpenChange?.(next);
    if (controlledOpen === undefined) {
      setUncontrolled(next);
    }
  }

  return (
    <div
      className={cn('rounded-lg border border-[var(--border)]/80 bg-[var(--card)]/60', className)}
    >
      <button
        type="button"
        className="flex min-h-tap w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-[var(--foreground)] hover:bg-primary-soft/60"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{title}</span>
          {badge ? (
            <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">
              {badge}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-150',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="border-t border-[var(--border)]/80 px-3 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}
