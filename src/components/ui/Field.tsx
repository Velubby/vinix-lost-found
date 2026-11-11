'use client';

import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, optional, action, className, children }: FieldShellProps) {
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={id} className="block text-[13px] font-semibold text-ink">
          {label}
          {optional && <span className="ml-1 font-normal text-muted">(opsional)</span>}
        </label>
        {action}
      </div>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium leading-5 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

interface FieldExtras {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  action?: ReactNode;
  containerClassName?: string;
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement>, FieldExtras {}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, hint, error, optional, action, containerClassName, className, id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        optional={optional}
        action={action}
        className={containerClassName}
      >
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn('form-input w-full', className)}
          {...props}
        />
      </FieldShell>
    );
  }
);

TextInput.displayName = 'TextInput';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldExtras {}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, hint, error, optional, action, containerClassName, className, id, rows = 3, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        optional={optional}
        action={action}
        className={containerClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn('form-input w-full resize-y', className)}
          {...props}
        />
      </FieldShell>
    );
  }
);

TextArea.displayName = 'TextArea';

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldExtras {}

export const SelectInput = forwardRef<HTMLSelectElement, SelectInputProps>(
  ({ label, hint, error, optional, action, containerClassName, className, id, children, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;

    return (
      <FieldShell
        id={fieldId}
        label={label}
        hint={hint}
        error={error}
        optional={optional}
        action={action}
        className={containerClassName}
      >
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn('form-input w-full', className)}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  }
);

SelectInput.displayName = 'SelectInput';
