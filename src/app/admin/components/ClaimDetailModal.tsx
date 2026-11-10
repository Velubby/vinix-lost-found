'use client';

import { useState } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import type { Claim } from '@/types/claims';
import { STATUS_LABELS } from '@/types/claims';
import { formatDate } from '@/lib/date';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
        <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-4">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
            Ciri privat yang dijelaskan pemohon:
          </span>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-800 leading-relaxed font-medium">
            {claim.private_answers}
          </p>
        </div>

        {/* Profile & Item Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">
              Data Pemohon
            </span>
            <p className="text-sm font-bold text-slate-900">
              {claim.claimant?.full_name}
            </p>
            <p className="text-slate-600">
              ID Karyawan: {claim.claimant?.employee_id || 'Belum diisi'}
            </p>
            <p className="text-slate-600">
              Departemen: {claim.claimant?.department || 'Belum diisi'}
            </p>
            {claim.contact_phone && (
              <p className="text-slate-600">
                No. Telepon: {claim.contact_phone}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-3.5 space-y-1">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block">
              Informasi Barang Temuan
            </span>
            <p className="text-sm font-bold text-slate-900">
              {claim.item?.title}
            </p>
            <p className="text-slate-600">
              Lokasi: {claim.item?.location}
            </p>
            <p className="text-slate-600">
              Status saat ini: {claim.status === 'disetujui' && claim.pickup_at ? 'Sudah diambil' : STATUS_LABELS[claim.status]}
            </p>
          </div>
        </div>

        {/* Pickup Location Configuration */}
        {claim.status !== 'ditolak' && claim.status !== 'disetujui' && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label htmlFor="pickup-input" className="text-xs font-bold text-slate-700 block">
              Tentukan Lokasi Pengambilan Barang
            </label>
            <input
              id="pickup-input"
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="Contoh: Resepsionis / Lobi Utama VINIX7"
              className="form-input w-full text-sm"
            />

            {/* Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-500 mr-1">Pilihan cepat:</span>
              {quickLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setPickupLocation(loc)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                    pickupLocation === loc
                      ? 'bg-[#123356] text-white border-[#123356]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Setelah disetujui, pemohon dapat melihat lokasi ini dan mengambil barang pada jam kerja kantor dengan menunjukkan tiket klaim.
            </p>
          </div>
        )}

        {/* Approved: handover state */}
        {claim.status === 'disetujui' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm text-emerald-900">
            <p className="font-bold">Klaim disetujui</p>
            <p className="text-xs">
              Lokasi pengambilan: <strong>{claim.pickup_location || DEFAULT_PICKUP_LOCATION}</strong>
            </p>
            {claim.pickup_at ? (
              <p className="text-xs">Diserahkan pada: {formatDate(claim.pickup_at)}</p>
            ) : (
              <p className="text-xs">
                Barang belum diserahkan. Tandai setelah pemohon datang, identitas dicek, dan barang benar-benar diserahkan.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons in Modal */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isPending}
          >
            Tutup
          </Button>

          {claim.status === 'ditolak' && (
            <Button
              variant="outline"
              size="md"
              onClick={() => onReopenReview(claim.id)}
              loading={isPending}
              className="text-sky-700 border-sky-300 hover:bg-sky-50"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Tinjau Kembali Klaim Ini
            </Button>
          )}

          {claim.status === 'disetujui' && !claim.pickup_at && (
            <Button
              variant="primary"
              size="md"
              onClick={() => onMarkHandedOver(claim.id)}
              loading={isMarkingHandedOver}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              <Check className="w-4 h-4" />
              Tandai Sudah Diambil
            </Button>
          )}

          {claim.status !== 'ditolak' && claim.status !== 'disetujui' && (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => onRejectModalOpen(claim)}
                loading={isPending}
                className="text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <X className="w-4 h-4" />
                Tolak Klaim
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => onApprove(claim.id, pickupLocation)}
                loading={isPending}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                <Check className="w-4 h-4" />
                Setujui Klaim
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
