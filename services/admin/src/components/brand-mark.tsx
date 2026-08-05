import { cn } from '../lib/utils';

/** Flat OpenEventHub mark (hub of event sources). Uses currentColor for header contrast. */
export function BrandMark({ className }: { readonly className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={cn('h-7 w-7 shrink-0', className)}
      aria-hidden
    >
      <rect x="4" y="4" width="56" height="56" rx="14" stroke="currentColor" strokeWidth="5" />
      <circle cx="32" cy="32" r="7" fill="currentColor" />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" />
      <circle cx="48" cy="16" r="4.5" fill="currentColor" />
      <circle cx="16" cy="48" r="4.5" fill="currentColor" />
      <circle cx="48" cy="48" r="4.5" fill="currentColor" />
      <path
        d="M27.2 27.2 19.2 19.2M36.8 27.2 44.8 19.2M27.2 36.8 19.2 44.8M36.8 36.8 44.8 44.8"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
