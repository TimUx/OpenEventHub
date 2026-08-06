import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

/** Shared control height across portal pages (matches Input). */
export const CONTROL_HEIGHT = 'h-11 min-h-tap';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-contrast hover:bg-primary-bright shadow-soft',
        outline: 'border-2 border-primary bg-[var(--card)] text-primary hover:bg-primary-soft',
        ghost: 'text-primary hover:bg-primary-soft',
      },
      size: {
        // One standard size site-wide so CTAs, forms, and linked buttons align.
        default: `${CONTROL_HEIGHT} px-4`,
        sm: `${CONTROL_HEIGHT} px-4`,
        lg: `${CONTROL_HEIGHT} px-4`,
        icon: `${CONTROL_HEIGHT} min-w-11 px-0`,
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export { buttonVariants };

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
