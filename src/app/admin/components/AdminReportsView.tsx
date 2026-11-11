'use client';

import {
  Search,
  FileText,
  MapPin,
  Tag,
  User,
  Phone,
  ExternalLink,
  ShieldAlert,
  Eye,
  CheckCircle2,
  CheckCheck,
  Copy,
  MessageCircle,
  Check,
  AlertCircle,
  Clock3,
} from 'lucide-react';
import type { LostReport, FilterReportStatus } from '@/types/claims';
import { REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/types/claims';
import { formatDate } from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ClaimCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface AdminReportsViewProps {
  lostReports: LostReport[];
  isLoading: boolean;
  reportsError: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterReportStatus;
  onStatusFilterChange: (status: FilterReportStatus) => void;
  onSelectReport: (report: LostReport) => void;
  onOpenMarkFound: (report: LostReport) => void;
  onOpenCompleteHandover: (report: LostReport) => void;
  onCopyTicket: (code: string) => void;
  copiedTicket: string | null;
  getWhatsAppVerificationUrl: (report: LostReport) => string | null;
  isUpdatingReport: boolean;
  onRetry: () => void;
}

const REPORT_FILTERS: FilterReportStatus[] = ['semua', 'aktif', 'ditemukan', 'selesai'];

export function AdminReportsView({
  lostReports,
  isLoading,
  reportsError,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onSelectReport,
  onOpenMarkFound,
  onOpenCompleteHandover,
  onCopyTicket,
  copiedTicket,
  getWhatsAppVerificationUrl,
  isUpdatingReport,
  onRetry,
}: AdminReportsViewProps) {
  return (
    <div className="space-y-5">
      {/* Filter and Search Controls for Lost Reports */}
      <section
        aria-label="Pencarian Laporan Hilang"
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        <div className="relative w-full md:max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari kode tiket, nama barang, pelapor, atau lokasi..."
            className="form-input form-input-icon-left w-full"
            aria-label="Cari laporan barang hilang"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-muted">Status:</span>
          {REPORT_FILTERS.map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                aria-pressed={isActive}
                className={[
                  'inline-flex min-h-9 items-center rounded-pill border px-3 text-xs font-semibold transition-colors',
                  isActive
                    ? 'border-brand bg-brand text-inverse'
                    : 'border-line bg-surface text-body hover:border-line-strong hover:bg-surface-muted',
                ].join(' ')}
              >
                {REPORT_STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Counter info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Menampilkan {lostReports.length} laporan kehilangan</span>
        {isLoading && <span>Memuat data...</span>}
      </div>

      {/* Error State */}
      {reportsError && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-card border border-danger/20 bg-danger-soft p-5 text-danger sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1 text-[13px] leading-5">
              <p className="font-semibold">Gagal memuat laporan kehilangan</p>
              <p>{reportsError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-full border-danger/30 text-danger hover:bg-danger-soft sm:w-auto"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid gap-3">
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && lostReports.length === 0 && !reportsError && (
        <EmptyState
          icon={<Clock3 className="size-6" aria-hidden="true" />}
          title={
            searchQuery
              ? `Tidak ada laporan yang cocok dengan "${searchQuery}"`
              : statusFilter !== 'semua'
              ? `Tidak ada laporan berstatus ${REPORT_STATUS_LABELS[statusFilter]}`
              : 'Belum ada laporan barang hilang yang diajukan'
          }
          description="Laporan kehilangan yang dikirim oleh karyawan akan muncul di sini."
        />
      )}

      {/* Lost Reports Cards Grid */}
      {!isLoading && lostReports.length > 0 && (
        <div className="grid gap-3">
          {lostReports.map((report) => {
            const statusColor = REPORT_STATUS_COLORS[report.status];
            return (
              <article
                key={report.id}
                className="rounded-card border border-line bg-surface p-4 sm:p-5"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopyTicket(report.report_code)}
                        className="inline-flex min-h-7 items-center gap-1.5 rounded-control border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-body transition-colors hover:bg-surface hover:text-ink"
                        title="Salin nomor laporan"
                      >
                        <FileText className="size-3.5 text-muted" aria-hidden="true" />
                        <span className="tabular-nums">{report.report_code}</span>
                        {copiedTicket === report.report_code ? (
                          <CheckCheck className="size-3 text-success" aria-hidden="true" />
                        ) : (
                          <Copy className="size-3 text-muted" aria-hidden="true" />
                        )}
                      </button>

                      <Badge
                        variant="outline"
                        className={`${statusColor.bg} ${statusColor.border} ${statusColor.text}`}
                      >
                        <span className={`size-1.5 rounded-full ${statusColor.dot}`} aria-hidden="true" />
                        {REPORT_STATUS_LABELS[report.status]}
                      </Badge>

                      <span className="text-xs text-muted">
                        Dilaporkan {formatDate(report.created_at)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-balance text-[15px] font-semibold text-ink sm:text-base">
                        {report.item_title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-pretty text-[13px] leading-5 text-body">
                        {report.public_description}
                      </p>
                    </div>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        Lokasi hilang: <strong className="font-medium text-body">{report.location}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Tag className="size-3.5" aria-hidden="true" />
                        Kategori: <strong className="font-medium text-body">{report.category}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="size-3.5" aria-hidden="true" />
                        Pelapor: <strong className="font-medium text-body">{report.reporter?.full_name || 'Pengguna'}</strong>
                        {report.reporter?.employee_id && ` (${report.reporter.employee_id})`}
                        {report.reporter?.department && ` · ${report.reporter.department}`}
                      </span>
                      {report.contact_phone && (
                        <a
                          href={`https://wa.me/${report.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-brand"
                        >
                          <Phone className="size-3.5" aria-hidden="true" />
                          {report.contact_phone}
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>

                    {/* Secret Description Preview Notice */}
                    {report.private_description && (
                      <div className="flex items-start gap-2.5 rounded-surface border border-warning/20 bg-warning-soft p-3 text-[13px] leading-5">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                        <div className="min-w-0">
                          <strong className="block font-semibold text-ink">
                            Ciri Rahasia / Spesifik (Privat):
                          </strong>
                          <span className="line-clamp-1 text-body">{report.private_description}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:w-56 lg:flex-col lg:items-stretch">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onSelectReport(report)}
                      className="w-full"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Detail &amp; Verifikasi
                    </Button>

                    {report.status === 'aktif' && (
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => onOpenMarkFound(report)}
                        loading={isUpdatingReport}
                        className="w-full"
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Tandai Ditemukan
                      </Button>
                    )}

                    {report.status === 'ditemukan' && (
                      <>
                        {report.contact_phone && (
                          <a
                            href={getWhatsAppVerificationUrl(report) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary w-full text-[13px]"
                            title="Kirim pesan verifikasi WhatsApp"
                          >
                            <MessageCircle className="size-4" aria-hidden="true" />
                            <span>Hubungi WA</span>
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => onOpenCompleteHandover(report)}
                          loading={isUpdatingReport}
                          className="w-full"
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Serah Terima
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
