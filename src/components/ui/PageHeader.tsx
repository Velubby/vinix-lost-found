import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</p>
        )}
        <h1 className="text-balance text-3xl font-semibold text-ink">{title}</h1>
        {description && (
          <p className="max-w-2xl text-pretty text-sm leading-6 text-body">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
