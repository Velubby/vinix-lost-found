'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { LostReport } from '@/types/claims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DEFAULT_PICKUP_LOCATION } from '@/lib/locations';

interface CustodyChainModalProps {
  report: LostReport | null;
  onClose: () => void;
  onConfirm: (data: {
    finderName: string;
    foundLocation: string;
    storageLocation: string;
    note: string;
  }) => void;
  isPending: boolean;
  quickLocations: string[];
}

export function CustodyChainModal({
  report,
  onClose,
  onConfirm,
  isPending,
  quickLocations,
}: CustodyChainModalProps) {
  const [finderName, setFinderName] = useState('');
  const [foundLocation, setFoundLocation] = useState(report?.location || '');
  const [storageLocation, setStorageLocation] = useState(quickLocations[0] || DEFAULT_PICKUP_LOCATION);
  const [foundNote, setFoundNote] = useState('');

  if (!report) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      finderName: finderName.trim(),
      foundLocation: foundLocation.trim(),
      storageLocation: storageLocation.trim(),
      note: foundNote.trim(),
    });
  };

  return (
    <Modal
      open={Boolean(report)}
      onOpenChange={(open) => !open && onClose()}
      title="Catat Penemuan & Posko Penyimpanan"
      description={`Laporan: ${report.item_title} (${report.report_code})`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl bg-sky-50 border border-sky-100 p-3.5 text-xs text-sky-900 leading-relaxed">
          Lengkapi data orang yang menyerahkan barang dan lokasi penyimpanan fisik agar riwayat rantai penanganan (chain of custody) tercatat di linimasa pelapor.
        </div>

        <div>
          <label htmlFor="finder-name" className="text-xs font-bold text-slate-700 block mb-1">
            Nama / Identitas Penemu Barang
          </label>
          <input
            id="finder-name"
            type="text"
            value={finderName}
            onChange={(e) => setFinderName(e.target.value)}
            placeholder="Contoh: Budi Santoso (karyawan FT) / Petugas Kebersihan"
            className="form-input w-full text-xs sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="found-location" className="text-xs font-bold text-slate-700 block mb-1">
            Lokasi Ditemukan
          </label>
          <input
            id="found-location"
            type="text"
            value={foundLocation}
            onChange={(e) => setFoundLocation(e.target.value)}
            placeholder="Contoh: Meja dekat Resepsionis, Ruang Meeting"
            className="form-input w-full text-xs sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="storage-location" className="text-xs font-bold text-slate-700 block mb-1">
            Lokasi Penyimpanan Barang
          </label>
          <input
            id="storage-location"
            type="text"
            value={storageLocation}
            onChange={(e) => setStorageLocation(e.target.value)}
            placeholder="Contoh: Resepsionis / Lobi Utama VINIX7"
            className="form-input w-full text-xs sm:text-sm"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickLocations.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setStorageLocation(loc)}
                className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                  storageLocation === loc
                    ? 'bg-[#123356] text-white border-[#123356]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="found-note" className="text-xs font-bold text-slate-700 block mb-1">
            Catatan Kondisi Barang (Opsional)
          </label>
          <textarea
            id="found-note"
            rows={2}
            value={foundNote}
            onChange={(e) => setFoundNote(e.target.value)}
            placeholder="Contoh: Kondisi layar mulus, baterai habis, disimpan di loker posko."
            className="form-input w-full text-xs sm:text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isPending}
            className="bg-sky-700 hover:bg-sky-800"
          >
            <CheckCircle2 className="w-4 h-4" />
            Simpan & Tandai Ditemukan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
