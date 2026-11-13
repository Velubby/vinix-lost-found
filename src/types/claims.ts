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
  reviewed_at?: string | null;
  approved_at?: string | null;
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
  diajukan: { bg: 'bg-warning-soft', text: 'text-warning', dot: 'bg-warning', border: 'border-warning/20' },
  ditinjau: { bg: 'bg-info-soft', text: 'text-info', dot: 'bg-info', border: 'border-info/20' },
  disetujui: { bg: 'bg-success-soft', text: 'text-success', dot: 'bg-success', border: 'border-success/20' },
  ditolak: { bg: 'bg-danger-soft', text: 'text-danger', dot: 'bg-danger', border: 'border-danger/20' },
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
  draf: { bg: 'bg-surface-muted', text: 'text-body', dot: 'bg-muted', border: 'border-line' },
  aktif: { bg: 'bg-warning-soft', text: 'text-warning', dot: 'bg-warning', border: 'border-warning/20' },
  ditemukan: { bg: 'bg-info-soft', text: 'text-info', dot: 'bg-info', border: 'border-info/20' },
  klaim: { bg: 'bg-accent/10', text: 'text-accent', dot: 'bg-accent', border: 'border-accent/20' },
  selesai: { bg: 'bg-success-soft', text: 'text-success', dot: 'bg-success', border: 'border-success/20' },
};