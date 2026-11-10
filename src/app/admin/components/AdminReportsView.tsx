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
    <div className="space-y-6">
      {/* Filter and Search Controls for Lost Reports */}
      <section aria-label="Pencarian Laporan Hilang" className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari kode tiket, nama barang, pelapor, atau lokasi..."
            className="form-input form-input-icon-left w-full text-xs sm:text-sm min-h-[44px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
          {(['semua', 'aktif', 'ditemukan', 'selesai'] as FilterReportStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === status
                  ? 'bg-[#123356] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {REPORT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </section>

      {/* Counter info */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Menampilkan {lostReports.length} laporan kehilangan</span>
        {isLoading && <span>Memuat data...</span>}
      </div>

      {/* Error State */}
      {reportsError && (
        <div className="apple-card bg-rose-50 border border-rose-200 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-400" />
          <h2 className="mt-3 text-base font-bold text-rose-800">Gagal memuat laporan kehilangan</h2>
          <p className="mt-1 text-xs text-rose-700 max-w-sm mx-auto">{reportsError}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={onRetry} className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100">
              Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid gap-4">
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && lostReports.length === 0 && !reportsError && (
        <div className="apple-card bg-white p-12 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-[#123356]">
            {searchQuery
              ? `Tidak ada laporan yang cocok dengan "${searchQuery}"`
              : statusFilter !== 'semua'
              ? `Tidak ada laporan berstatus ${REPORT_STATUS_LABELS[statusFilter]}`
              : 'Belum ada laporan barang hilang yang diajukan'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Laporan kehilangan yang dikirim oleh karyawan akan muncul di sini.
          </p>
        </div>
      )}

      {/* Lost Reports Cards Grid */}
      {!isLoading && lostReports.length > 0 && (
        <div className="grid gap-4">
          {lostReports.map((report) => {
            const statusColor = REPORT_STATUS_COLORS[report.status];
            return (
              <article
                key={report.id}
                className="apple-card bg-white p-5 transition-shadow hover:shadow-md border border-slate-200/90"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCopyTicket(report.report_code)}
                        className="inline-flex items-center gap-1 font-mono text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-md transition-colors"
                        title="Salin nomor laporan"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{report.report_code}</span>
                        {copiedTicket === report.report_code ? (
                          <CheckCheck className="w-3 h-3 text-emerald-600 ml-0.5" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-400 ml-0.5" />
                        )}
                      </button>

                      <Badge variant="outline" className={`${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot} mr-1.5`} />
                        {REPORT_STATUS_LABELS[report.status]}
                      </Badge>

                      <span className="text-xs text-slate-400">
                        Dilaporkan {formatDate(report.created_at)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#123356]">
                        {report.item_title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {report.public_description}
                      </p>
                    </div>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Lokasi hilang: <strong>{report.location}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        Kategori: <strong>{report.category}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Pelapor: <strong>{report.reporter?.full_name || 'Pengguna'}</strong>
                        {report.reporter?.employee_id && ` (${report.reporter.employee_id})`}
                        {report.reporter?.department && ` · ${report.reporter.department}`}
                      </span>
                      {report.contact_phone && (
                        <a
                          href={`https://wa.me/${report.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {report.contact_phone}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Secret Description Preview Notice */}
                    {report.private_description && (
                      <div className="mt-2 rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950">Ciri Rahasia / Spesifik (Privat):</strong>
                          <span className="line-clamp-1 text-amber-800">{report.private_description}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex shrink-0 flex-wrap lg:flex-col items-end gap-2 pt-2 lg:pt-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectReport(report)}
                      className="text-xs min-h-[40px]"
                    >
                      <Eye className="w-4 h-4 text-sky-800" />
                      Detail & Verifikasi
                    </Button>

                    {report.status === 'aktif' && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => onOpenMarkFound(report)}
                        loading={isUpdatingReport}
                        className="bg-sky-700 hover:bg-sky-800 text-xs min-h-[40px]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Tandai Ditemukan
                      </Button>
                    )}

                    {report.status === 'ditemukan' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {report.contact_phone && (
                          <a
                            href={getWhatsAppVerificationUrl(report) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 min-h-[40px] transition-colors"
                            title="Kirim pesan verifikasi WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                            <span>Hubungi WA</span>
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => onOpenCompleteHandover(report)}
                          loading={isUpdatingReport}
                          className="bg-emerald-700 hover:bg-emerald-800 text-xs min-h-[40px]"
                        >
                          <Check className="w-4 h-4" />
                          Serah Terima
                        </Button>
                      </div>
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
