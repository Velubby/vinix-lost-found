'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  const baseStyles = 'animate-pulse bg-slate-200 rounded';
  
  const variants = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
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
    <article className="apple-card bg-white p-5 sm:p-6 animate-pulse">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 rounded-xl bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-3/4 bg-slate-200 rounded" />
            <div className="h-4 w-1/2 bg-slate-200 rounded" />
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="h-4 w-1/4 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
          <div className="h-10 w-24 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </article>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="apple-card bg-white p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-slate-200 rounded mb-3" />
      <div className="h-10 w-1/2 bg-slate-200 rounded" />
    </div>
  );
}