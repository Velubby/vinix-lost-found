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
import { Check, ChevronDown, Filter } from 'lucide-react';
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
        <Button variant="outline" size="sm" className={cn('gap-1.5 min-h-[44px]', className)}>
          <Filter className="h-4 w-4" />
          <span>Status: {STATUS_LABELS[value]}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          className="w-48 min-w-[180px] bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 z-50 text-slate-800"
          sideOffset={6}
        >
          <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-3 py-1.5">
            Filter Status
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="h-px bg-slate-100 my-1" />
          <DropdownMenuRadioGroup value={value} onValueChange={(val) => onChange(val as FilterStatus)}>
            {(['semua', 'diajukan', 'ditinjau', 'disetujui', 'ditolak'] as FilterStatus[]).map((status) => (
              <DropdownMenuRadioItem
                key={status}
                value={status}
                className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-xs font-medium outline-none hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 data-[state=checked]:bg-sky-50 data-[state=checked]:text-[#123356]"
              >
                <span className="flex h-4 w-4 items-center justify-center mr-2">
                  {value === status ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : null}
                </span>
                <span className={value === status ? 'font-bold' : ''}>{STATUS_LABELS[status]}</span>
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
      <Button variant="ghost" size="sm" onClick={() => onView(claimId)} disabled={disabled} className="min-h-[44px]">
        <span className="text-slate-500">Selesai</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 min-h-[44px]" disabled={disabled}>
          <span>Aksi</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-48 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 z-50 text-slate-800"
        >
          <DropdownMenuItem
            onSelect={() => onView(claimId)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer outline-none hover:bg-slate-100 focus:bg-slate-100"
            disabled={disabled}
          >
            Lihat detail verifikasi
          </DropdownMenuItem>
          <DropdownMenuSeparator className="h-px bg-slate-100 my-1" />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.status}
              onSelect={() => onUpdate(claimId, action.status)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer outline-none hover:bg-slate-100 focus:bg-slate-100',
                action.variant === 'destructive' ? 'text-rose-700 hover:bg-rose-50 focus:bg-rose-50' : 'text-[#123356]'
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