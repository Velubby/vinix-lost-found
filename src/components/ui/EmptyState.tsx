import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, secondary, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface px-6 py-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="mx-auto flex size-12 items-center justify-center rounded-surface bg-surface-muted text-muted">
          {icon}
        </div>
      )}
      <h2 className="mt-4 text-balance text-lg font-semibold text-ink">{title}</h2>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-pretty text-sm leading-6 text-body">{description}</p>
      )}
      {(action || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
