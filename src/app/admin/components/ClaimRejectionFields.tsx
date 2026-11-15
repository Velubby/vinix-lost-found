'use client';

import { CLAIM_REJECTION_REASONS } from '@/lib/claim-reasons';
import { SelectInput, TextArea } from '@/components/ui/Field';

interface ClaimRejectionFieldsProps {
  preset: string;
  note: string;
  onPresetChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  idPrefix: string;
  noteMaxLength?: number;
}

export function ClaimRejectionFields({
  preset,
  note,
  onPresetChange,
  onNoteChange,
  idPrefix,
  noteMaxLength = 160,
}: ClaimRejectionFieldsProps) {
  return (
    <div className="space-y-4">
      <SelectInput
        id={`${idPrefix}-reason`}
        label="Alasan Penolakan"
        hint="Alasan ini tampil untuk pemohon di halaman lacak."
        value={preset}
        onChange={(event) => onPresetChange(event.target.value)}
      >
        {CLAIM_REJECTION_REASONS.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </SelectInput>

      <TextArea
        id={`${idPrefix}-note`}
        label="Catatan tambahan"
        optional
        rows={2}
        maxLength={noteMaxLength}
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Contoh: sebutkan bagian barang yang belum cocok atau bukti yang perlu dilengkapi."
        hint="Tulis singkat dan spesifik agar pemohon tahu apa yang harus diperbaiki."
        action={
          <span className="text-xs tabular-nums text-muted">
            {note.length}/{noteMaxLength}
          </span>
        }
      />
    </div>
  );
}
