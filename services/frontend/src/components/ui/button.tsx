import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

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
        default: 'min-h-tap h-11 px-4 py-2',
        sm: 'min-h-9 h-9 rounded-lg px-3 text-xs',
        lg: 'min-h-14 h-14 rounded-2xl px-6 text-base',
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
