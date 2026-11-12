'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { LostReport } from '@/types/claims';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TextInput, TextArea } from '@/components/ui/Field';
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

function QuickLocationChips({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: string[];
  onSelect: (location: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => onSelect(loc)}
          aria-pressed={value === loc}
          className={[
            'min-h-8 rounded-control border px-2.5 text-[11px] font-medium transition-colors',
            value === loc
              ? 'border-brand bg-brand text-inverse'
              : 'border-line bg-surface text-body hover:border-line-strong hover:bg-surface-muted',
          ].join(' ')}
        >
          {loc}
        </button>
      ))}
    </div>
  );
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
        <div className="rounded-surface border border-info/20 bg-info-soft p-3.5 text-[13px] leading-5 text-body">
          Lengkapi data orang yang menyerahkan barang dan lokasi penyimpanan fisik agar riwayat rantai penanganan (chain of custody) tercatat di linimasa pelapor.
        </div>

        <TextInput
          id="finder-name"
          label="Nama / Identitas Penemu Barang"
          value={finderName}
          onChange={(e) => setFinderName(e.target.value)}
          placeholder="Contoh: Budi Santoso (karyawan FT) / Petugas Kebersihan"
        />

        <TextInput
          id="found-location"
          label="Lokasi Ditemukan"
          value={foundLocation}
          onChange={(e) => setFoundLocation(e.target.value)}
          placeholder="Contoh: Meja dekat Resepsionis, Ruang Meeting"
        />

        <div className="space-y-1.5">
          <TextInput
            id="storage-location"
            label="Lokasi Penyimpanan Barang"
            value={storageLocation}
            onChange={(e) => setStorageLocation(e.target.value)}
            placeholder="Contoh: Resepsionis / Lobi Utama VINIX7"
          />
          <QuickLocationChips
            value={storageLocation}
            options={quickLocations}
            onSelect={setStorageLocation}
          />
        </div>

        <TextArea
          id="found-note"
          label="Catatan Kondisi Barang (Opsional)"
          rows={2}
          value={foundNote}
          onChange={(e) => setFoundNote(e.target.value)}
          placeholder="Contoh: Kondisi layar mulus, baterai habis, disimpan di loker posko."
        />

        <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Batal
          </Button>
          <Button
            type="submit"
            loading={isPending}
            className="w-full sm:w-auto"
          >
            {!isPending && <CheckCircle2 className="size-4" aria-hidden="true" />}
            Simpan &amp; Tandai Ditemukan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
