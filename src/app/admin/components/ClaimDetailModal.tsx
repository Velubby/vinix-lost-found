'use client';

import { useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import type { Claim } from '@/types/claims';
import { STATUS_LABELS } from '@/types/claims';
import { formatDate } from '@/lib/date';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';
import { DEFAULT_PICKUP_LOCATION } from '@/lib/locations';

interface ClaimDetailModalProps {
  claim: Claim | null;
  onClose: () => void;
  onApprove: (claimId: string, pickupLocation: string) => void;
  onRejectModalOpen: (claim: Claim) => void;
  onReopenReview: (claimId: string) => void;
  onMarkHandedOver: (claimId: string) => void;
  isPending: boolean;
  isMarkingHandedOver: boolean;
  quickLocations: string[];
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-[13px] leading-5 text-body">
      <span className="text-muted">{label}: </span>
      {children}
    </p>
  );
}

export function ClaimDetailModal({
  claim,
  onClose,
  onApprove,
  onRejectModalOpen,
  onReopenReview,
  onMarkHandedOver,
  isPending,
  isMarkingHandedOver,
  quickLocations,
}: ClaimDetailModalProps) {
  const [pickupLocation, setPickupLocation] = useState(
    claim?.pickup_location || quickLocations[0] || DEFAULT_PICKUP_LOCATION
  );

  if (!claim) return null;

  return (
    <Modal
      open={Boolean(claim)}
      onOpenChange={(open) => !open && onClose()}
      title="Verifikasi Bukti Kepemilikan"
      description={`Tiket ${claim.ticket_code} · Diajukan pada ${formatDate(claim.created_at)}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Claimant Confidential Answers */}
        <div className="rounded-surface border border-warning/20 bg-warning-soft p-4">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">
            Ciri privat yang dijelaskan pemohon:
          </span>
          <p className="mt-2 whitespace-pre-line text-pretty text-sm font-medium leading-6 text-ink">
            {claim.private_answers}
          </p>
        </div>

        {/* Profile & Item Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 rounded-surface border border-line bg-surface-muted p-4">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Data Pemohon
            </span>
            <p className="text-sm font-semibold text-ink">
              {claim.claimant?.full_name}
            </p>
            <SummaryRow label="ID Karyawan">{claim.claimant?.employee_id || 'Belum diisi'}</SummaryRow>
            <SummaryRow label="Departemen">{claim.claimant?.department || 'Belum diisi'}</SummaryRow>
            {claim.contact_phone && (
              <SummaryRow label="No. Telepon">{claim.contact_phone}</SummaryRow>
            )}
          </div>

          <div className="space-y-1 rounded-surface border border-line bg-surface-muted p-4">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Informasi Barang Temuan
            </span>
            <p className="text-sm font-semibold text-ink">
              {claim.item?.title}
            </p>
            <SummaryRow label="Lokasi">{claim.item?.location}</SummaryRow>
            <SummaryRow label="Status saat ini">
              {claim.status === 'disetujui' && claim.pickup_at ? 'Sudah diambil' : STATUS_LABELS[claim.status]}
            </SummaryRow>
          </div>
        </div>

        {/* Pickup Location Configuration */}
        {claim.status !== 'ditolak' && claim.status !== 'disetujui' && (
          <div className="space-y-2 border-t border-line pt-5">
            <TextInput
              id="pickup-input"
              label="Tentukan Lokasi Pengambilan Barang"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="Contoh: Resepsionis / Lobi Utama VINIX7"
            />

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-1 text-[11px] text-muted">Pilihan cepat:</span>
              {quickLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setPickupLocation(loc)}
                  aria-pressed={pickupLocation === loc}
                  className={[
                    'min-h-8 rounded-control border px-2.5 text-[11px] font-medium transition-colors',
                    pickupLocation === loc
                      ? 'border-brand bg-brand text-inverse'
                      : 'border-line bg-surface text-body hover:border-line-strong hover:bg-surface-muted',
                  ].join(' ')}
                >
                  {loc}
                </button>
              ))}
            </div>
            <p className="pt-1 text-xs leading-5 text-muted">
              Setelah disetujui, pemohon dapat melihat lokasi ini dan mengambil barang pada jam kerja kantor dengan menunjukkan tiket klaim.
            </p>
          </div>
        )}

        {/* Approved: handover state */}
        {claim.status === 'disetujui' && (
          <div className="space-y-1.5 rounded-surface border border-success/20 bg-success-soft p-4 text-[13px] leading-5 text-body">
            <p className="font-semibold text-ink">Klaim disetujui</p>
            <p>
              Lokasi pengambilan:{' '}
              <strong className="font-semibold text-ink">
                {claim.pickup_location || DEFAULT_PICKUP_LOCATION}
              </strong>
            </p>
            {claim.pickup_at ? (
              <p className="text-success">Diserahkan pada: {formatDate(claim.pickup_at)}</p>
            ) : (
              <p>
                Barang belum diserahkan. Tandai setelah pemohon datang, identitas dicek, dan barang benar-benar diserahkan.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons in Modal */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Tutup
          </Button>

          {claim.status === 'ditolak' && (
            <Button
              variant="outline"
              onClick={() => onReopenReview(claim.id)}
              loading={isPending}
              className="w-full border-accent/30 text-accent hover:bg-accent/5 sm:w-auto"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Tinjau Kembali Klaim Ini
            </Button>
          )}

          {claim.status === 'disetujui' && !claim.pickup_at && (
            <Button
              variant="primary"
              onClick={() => onMarkHandedOver(claim.id)}
              loading={isMarkingHandedOver}
              className="w-full sm:w-auto"
            >
              <Check className="size-4" aria-hidden="true" />
              Tandai Sudah Diambil
            </Button>
          )}

          {claim.status !== 'ditolak' && claim.status !== 'disetujui' && (
            <>
              <Button
                variant="outline"
                onClick={() => onRejectModalOpen(claim)}
                loading={isPending}
                className="w-full border-danger/30 text-danger hover:bg-danger-soft sm:w-auto"
              >
                <X className="size-4" aria-hidden="true" />
                Tolak Klaim
              </Button>
              <Button
                variant="primary"
                onClick={() => onApprove(claim.id, pickupLocation)}
                loading={isPending}
                className="w-full sm:w-auto"
              >
                <Check className="size-4" aria-hidden="true" />
                Setujui Klaim
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
