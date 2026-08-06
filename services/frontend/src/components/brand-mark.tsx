import { cn } from '../lib/utils';

/** Flat OpenEventHub mark: calendar (events) + hub of connected sources. Uses currentColor. */
export function BrandMark({ className }: { readonly className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn('h-7 w-7 shrink-0', className)}
      aria-hidden
    >
      <rect x="17" y="4" width="7" height="12" rx="3.5" fill="currentColor" />
      <rect x="40" y="4" width="7" height="12" rx="3.5" fill="currentColor" />
      <rect x="6" y="10" width="52" height="48" rx="12" stroke="currentColor" strokeWidth="4.5" />
      <path d="M15 22h34" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="39" r="6.5" fill="currentColor" />
      <circle cx="17.5" cy="30" r="4" fill="currentColor" />
      <circle cx="46.5" cy="30" r="4" fill="currentColor" />
      <circle cx="17.5" cy="49" r="4" fill="currentColor" />
      <circle cx="46.5" cy="49" r="4" fill="currentColor" />
      <path
        d="M27.8 35.2 20.8 31.8M36.2 35.2 43.2 31.8M27.8 43 20.8 46.5M36.2 43 43.2 46.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
