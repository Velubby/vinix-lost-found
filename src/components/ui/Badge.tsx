'use client';

import { cn } from '@/lib/utils';
import type { ClaimStatus } from '@/types/claims';
import { STATUS_COLORS } from '@/types/claims';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'status' | 'outline';
  status?: ClaimStatus;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', status, className, dot = false }: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-semibold text-xs rounded-pill px-2.5 py-1';
  
  const variants = {
    default: 'bg-surface-muted text-body',
    outline: 'border border-line text-body bg-transparent',
    status: status ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}` : 'bg-surface-muted text-body',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)}>
      {variant === 'status' && status && dot && (
        <span className={`size-1.5 rounded-full ${STATUS_COLORS[status].dot}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}