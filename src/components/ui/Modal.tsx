'use client';

import { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  action,
  cancelText = 'Batal',
  confirmText = 'Konfirmasi',
  onConfirm,
  loading,
  size = 'md',
}: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <DialogContent className={cn(
          'fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] bg-white rounded-2xl shadow-xl p-6',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          sizes[size]
        )}>
          <div className="flex flex-col gap-2 pb-4 border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-extrabold text-[#123356]">{title}</DialogTitle>
                {description && <DialogDescription className="mt-1 text-sm text-slate-500">{description}</DialogDescription>}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-4">{children}</div>
          {(action || onConfirm) && (
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                {cancelText}
              </Button>
              {action || (
                <Button variant="primary" onClick={onConfirm} disabled={loading} loading={loading}>
                  {confirmText}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'primary';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  confirmText = 'Ya, lanjutkan',
  cancelText = 'Batal',
  variant = 'destructive',
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      cancelText={cancelText}
      action={
        <Button variant={variant} onClick={onConfirm} disabled={loading} loading={loading}>
          {confirmText}
        </Button>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
}