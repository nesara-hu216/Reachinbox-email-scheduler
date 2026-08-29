import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { JobStatus } from '../../types';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        SCHEDULED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        PROCESSING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse',
        SENT: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        FAILED: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        default: 'bg-slate-800 text-slate-300 border border-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status?: JobStatus;
}

export function Badge({ className, variant, status, children, ...props }: BadgeProps) {
  const activeVariant = status || variant || 'default';

  return (
    <div className={cn(badgeVariants({ variant: activeVariant as any, className }))} {...props}>
      <span
        className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-amber-400': activeVariant === 'SCHEDULED',
          'bg-blue-400': activeVariant === 'PROCESSING',
          'bg-emerald-400': activeVariant === 'SENT',
          'bg-rose-400': activeVariant === 'FAILED',
          'bg-slate-400': activeVariant === 'default',
        })}
      />
      {children || status}
    </div>
  );
}
