'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Claim } from '@/types/claims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Field';

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
        <div className="rounded-surface border border-warning/20 bg-warning-soft p-3.5 text-[13px] leading-5 text-body">
          Penolakan klaim akan mencatat status ditolak di linimasa pemohon. Anda tetap dapat memulihkan status ke &quot;Ditinjau&quot; jika terjadi salah klik atau pemohon membawa bukti baru.
        </div>

        <TextArea
          id="reject-reason"
          label="Alasan Penolakan"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Tuliskan alasan penolakan agar tercatat di audit linimasa..."
        />

        <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(claim, rejectReason.trim())}
            loading={isPending}
            className="w-full border-danger/30 text-danger hover:bg-danger-soft sm:w-auto"
          >
            {!isPending && <X className="size-4" aria-hidden="true" />}
            Konfirmasi Tolak Klaim
          </Button>
        </div>
      </div>
    </Modal>
  );
}
