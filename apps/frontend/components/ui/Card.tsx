import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl glass-card p-5 text-slate-100 shadow-xl shadow-black/20 border border-slate-800/80',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
