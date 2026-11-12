import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface',
        interactive && 'transition-colors duration-150 hover:border-line-strong hover:shadow-card',
        className
      )}
      {...props}
    />
  );
}
