'use client';

import * as React from 'react';
import { Root as CheckboxRoot, Indicator as CheckboxIndicator } from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxRoot>;

export const Checkbox = React.forwardRef<React.ElementRef<typeof CheckboxRoot>, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <CheckboxRoot
      ref={ref}
      className={cn(
        'peer h-5 w-5 shrink-0 rounded-md border border-slate-300 bg-white ring-offset-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#123356] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-[#123356] data-[state=checked]:text-white data-[state=checked]:border-[#123356]',
        'transition-colors duration-150 cursor-pointer',
        className
      )}
      {...props}
    >
      <CheckboxIndicator className={cn('flex items-center justify-center text-current')}>
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </CheckboxIndicator>
    </CheckboxRoot>
  )
);

Checkbox.displayName = 'Checkbox';