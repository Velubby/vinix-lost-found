// Staff pick a shared reason so claimants get consistent wording and the admin
// form stays quick. A short free-text note can add case-specific context.
export const CLAIM_REJECTION_REASONS = [
  {
    value: 'Ciri kepemilikan belum cocok dengan barang temuan.',
    label: 'Ciri kepemilikan belum cocok',
  },
  {
    value: 'Bukti kepemilikan yang dikirim belum cukup untuk verifikasi.',
    label: 'Bukti kepemilikan kurang',
  },
  {
    value: 'Barang temuan bukan milik pemohon.',
    label: 'Bukan barang pemohon',
  },
  {
    value: 'Pemohon tidak dapat dihubungi saat verifikasi.',
    label: 'Pemohon tidak bisa dihubungi',
  },
  {
    value: 'Klaim duplikat: sudah ada tiket aktif untuk barang ini.',
    label: 'Klaim duplikat',
  },
] as const;

export const CLAIM_CLOSED_NOTE =
  'Ditutup karena barang sudah diklaim dan diserahkan kepada pemohon lain yang terverifikasi.';

export function composeDecisionNote(reason: string, note?: string): string {
  const trimmedReason = reason.trim();
  const trimmedNote = note?.trim();
  if (!trimmedNote) return trimmedReason;

  const combined = `${trimmedReason} Catatan: ${trimmedNote}`;
  return combined.length <= 300 ? combined : `${combined.slice(0, 297).trimEnd()}...`;
}
