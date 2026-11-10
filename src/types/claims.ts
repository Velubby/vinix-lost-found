/**
 * Shared types for claims and reports management (admin)
 * Used across server actions, hooks, and components
 */

export type ClaimStatus = 'diajukan' | 'ditinjau' | 'disetujui' | 'ditolak';
export type FilterStatus = ClaimStatus | 'semua';

export interface ClaimItem {
  id: string;
  title: string;
  location: string;
  image_url: string | null;
}

export interface Claimant {
  id: string;
  full_name: string;
  phone: string | null;
  department?: string | null;
  employee_id?: string | null;
  // Legacy fields (compat)
  student_number?: string | null;
  faculty?: string | null;
  study_program?: string | null;
}

export interface Claim {
  id: string;
  item_id: string;
  report_id?: string | null;
  user_id: string;
  private_answers: string;
  contact_phone: string;
  status: ClaimStatus;
  ticket_code: string;
  pickup_location: string | null;
  pickup_at: string | null;
  created_at: string;
  updated_at: string;
  item?: ClaimItem | null;
  claimant?: Claimant | null;
}

export interface ClaimsResponse {
  claims: Claim[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface UpdateClaimInput {
  claimId: string;
  status: Exclude<ClaimStatus, 'diajukan'>;
  pickupLocation?: string;
  rejectReason?: string;
}

export interface BulkUpdateInput {
  claimIds: string[];
  status: Exclude<ClaimStatus, 'diajukan'>;
  pickupLocation?: string;
}

export interface ClaimStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export const STATUS_LABELS: Record<FilterStatus, string> = {
  semua: 'Semua',
  diajukan: 'Diajukan',
  ditinjau: 'Ditinjau',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};

export const STATUS_COLORS: Record<ClaimStatus, { bg: string; text: string; dot: string; border: string }> = {
  diajukan: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
  ditinjau: { bg: 'bg-sky-50', text: 'text-sky-800', dot: 'bg-sky-500', border: 'border-sky-200' },
  disetujui: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  ditolak: { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500', border: 'border-rose-200' },
};

export type ReportStatus = 'draf' | 'aktif' | 'ditemukan' | 'klaim' | 'selesai';
export type FilterReportStatus = ReportStatus | 'semua';

export interface LostReport {
  id: string;
  report_code: string;
  user_id: string;
  type: 'hilang' | 'temuan';
  item_title: string;
  category: string;
  location: string;
  incident_at: string;
  public_description: string;
  private_description?: string | null;
  image_url?: string | null;
  contact_phone: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  reporter?: Claimant | null;
  diterima_di_pos?: boolean;
  image_urls?: string[];
}

export const REPORT_STATUS_LABELS: Record<FilterReportStatus, string> = {
  semua: 'Semua Status',
  aktif: 'Aktif (Mencari)',
  ditemukan: 'Barang Ditemukan',
  klaim: 'Dalam Proses Klaim',
  selesai: 'Selesai / Dikembalikan',
  draf: 'Draf',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, { bg: string; text: string; dot: string; border: string }> = {
  draf: { bg: 'bg-slate-50', text: 'text-slate-700', dot: 'bg-slate-400', border: 'border-slate-200' },
  aktif: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500', border: 'border-amber-200' },
  ditemukan: { bg: 'bg-sky-50', text: 'text-sky-800', dot: 'bg-sky-500', border: 'border-sky-200' },
  klaim: { bg: 'bg-purple-50', text: 'text-purple-800', dot: 'bg-purple-500', border: 'border-purple-200' },
  selesai: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
};