'use client';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuPortal,
} from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Eye, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import type { FilterStatus } from '@/types/claims';
import { STATUS_LABELS } from '@/types/claims';

interface StatusFilterProps {
  value: FilterStatus;
  onChange: (value: FilterStatus) => void;
  className?: string;
}

export function StatusFilter({ value, onChange, className }: StatusFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('justify-between gap-1.5', className)}>
          <span className="inline-flex items-center gap-1.5">
            <Filter className="size-4" aria-hidden="true" />
            <span>Status: {STATUS_LABELS[value]}</span>
          </span>
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          className="z-50 min-w-[180px] rounded-surface border border-line bg-surface p-1.5 text-body shadow-overlay"
          sideOffset={6}
        >
          <DropdownMenuLabel className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Filter Status
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 h-px bg-line" />
          <DropdownMenuRadioGroup value={value} onValueChange={(val) => onChange(val as FilterStatus)}>
            {(['semua', 'diajukan', 'ditinjau', 'disetujui', 'ditolak'] as FilterStatus[]).map((status) => (
              <DropdownMenuRadioItem
                key={status}
                value={status}
                className="relative flex cursor-pointer select-none items-center rounded-control px-3 py-2 text-[13px] outline-none transition-colors hover:bg-surface-muted focus:bg-surface-muted data-[state=checked]:font-semibold data-[state=checked]:text-ink"
              >
                <span className="mr-2 flex size-4 items-center justify-center text-accent">
                  {value === status ? <Check className="size-3.5" aria-hidden="true" /> : null}
                </span>
                <span>{STATUS_LABELS[status]}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}

interface ActionMenuProps {
  claimId: string;
  currentStatus: 'diajukan' | 'ditinjau' | 'disetujui' | 'ditolak';
  onView: (claimId: string) => void;
  onUpdate: (claimId: string, status: 'ditinjau' | 'disetujui' | 'ditolak') => void;
  disabled?: boolean;
}

const statusActions: Record<string, { label: string; status: 'ditinjau' | 'disetujui' | 'ditolak'; variant: 'default' | 'destructive' }[]> = {
  diajukan: [
    { label: 'Tandai Ditinjau', status: 'ditinjau', variant: 'default' },
    { label: 'Setujui Klaim', status: 'disetujui', variant: 'default' },
    { label: 'Tolak Klaim', status: 'ditolak', variant: 'destructive' },
  ],
  ditinjau: [
    { label: 'Setujui Klaim', status: 'disetujui', variant: 'default' },
    { label: 'Tolak Klaim', status: 'ditolak', variant: 'destructive' },
  ],
  disetujui: [],
  ditolak: [],
};

export function ActionMenu({ claimId, currentStatus, onView, onUpdate, disabled }: ActionMenuProps) {
  const actions = statusActions[currentStatus];

  if (actions.length === 0) {
    return (
      <Button variant="ghost" size="sm" onClick={() => onView(claimId)} disabled={disabled}>
        <Eye className="size-4" aria-hidden="true" />
        <span className="text-muted">Selesai</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
          <span>Aksi</span>
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="z-50 w-48 rounded-surface border border-line bg-surface p-1.5 text-body shadow-overlay"
        >
          <DropdownMenuItem
            onSelect={() => onView(claimId)}
            className="flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-[13px] font-medium outline-none transition-colors hover:bg-surface-muted focus:bg-surface-muted"
            disabled={disabled}
          >
            Lihat detail verifikasi
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1 h-px bg-line" />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.status}
              onSelect={() => onUpdate(claimId, action.status)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-[13px] font-medium outline-none transition-colors hover:bg-surface-muted focus:bg-surface-muted',
                action.variant === 'destructive' ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'text-ink'
              )}
              disabled={disabled}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
