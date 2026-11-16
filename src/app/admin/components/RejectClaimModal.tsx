'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Claim } from '@/types/claims';
import { CLAIM_REJECTION_REASONS, composeDecisionNote } from '@/lib/claim-reasons';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ClaimRejectionFields } from './ClaimRejectionFields';

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
  const [preset, setPreset] = useState<string>(CLAIM_REJECTION_REASONS[0].value);
  const [note, setNote] = useState('');

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
          Alasan yang dipilih akan muncul di halaman lacak pemohon. Jika pemohon membawa bukti baru, petugas masih dapat membuka klaim ini kembali untuk ditinjau.
        </div>

        <ClaimRejectionFields
          preset={preset}
          note={note}
          onPresetChange={setPreset}
          onNoteChange={setNote}
          idPrefix="reject-claim"
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
            onClick={() => onConfirm(claim, composeDecisionNote(preset, note))}
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
