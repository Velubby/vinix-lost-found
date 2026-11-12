'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  const baseStyles = 'motion-safe:animate-pulse bg-line rounded-control';
  
  const variants = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-surface',
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function ClaimCardSkeleton() {
  return (
    <article className="apple-card bg-surface p-5 sm:p-6 animate-pulse">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="size-20 shrink-0 rounded-surface bg-line" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-3/4 bg-line rounded-control" />
            <div className="h-4 w-1/2 bg-line rounded-control" />
            <div className="h-4 w-1/3 bg-line rounded-control" />
            <div className="h-4 w-1/4 bg-line rounded-control" />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <div className="h-10 w-24 bg-line rounded-control" />
          <div className="h-10 w-24 bg-line rounded-control" />
        </div>
      </div>
    </article>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="apple-card bg-surface p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-line rounded-control mb-3" />
      <div className="h-10 w-1/2 bg-line rounded-control" />
    </div>
  );
}