'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Claim } from '@/types/claims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface RejectClaimModalProps {
  claim: Claim | null;
  onClose: () => void;
  onConfirm: (claim: Claim, reason: string) => void;
  isPending: boolean;
}

export function RejectClaimModal({
  claim,
  onClose,
  onConfirm,
  isPending,
}: RejectClaimModalProps) {
  const [rejectReason, setRejectReason] = useState(
    'Ciri rahasia yang diberikan belum sesuai dengan barang temuan.'
  );

  if (!claim) return null;

  return (
    <Modal
      open={Boolean(claim)}
      onOpenChange={(open) => !open && onClose()}
      title="Konfirmasi Penolakan Klaim"
      description={`Tiket: ${claim.ticket_code} · Pemohon: ${claim.claimant?.full_name || 'Pengguna'}`}
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
          Penolakan klaim akan mencatat status ditolak di linimasa pemohon. Anda tetap dapat memulihkan status ke &quot;Ditinjau&quot; jika terjadi salah klik atau pemohon membawa bukti baru.
        </div>

        <div>
          <label htmlFor="reject-reason" className="text-xs font-bold text-slate-700 block mb-1">
            Alasan Penolakan
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Tuliskan alasan penolakan agar tercatat di audit linimasa..."
            className="form-input w-full text-xs sm:text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(claim, rejectReason.trim())}
            loading={isPending}
            className="bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
          >
            <X className="w-4 h-4 mr-1" />
            Konfirmasi Tolak Klaim
          </Button>
        </div>
      </div>
    </Modal>
  );
}
