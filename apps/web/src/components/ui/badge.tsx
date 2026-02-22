import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-xs font-lcars tracking-wider uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-lcars-orange text-black shadow hover:bg-lcars-orange/80',
        secondary: 'bg-lcars-lavender text-black shadow hover:bg-lcars-lavender/80',
        destructive: 'bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'border border-lcars-bar text-foreground',
        success: 'bg-lcars-cyan text-black shadow hover:bg-lcars-cyan/80',
        warning: 'bg-lcars-gold text-black shadow hover:bg-lcars-gold/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
