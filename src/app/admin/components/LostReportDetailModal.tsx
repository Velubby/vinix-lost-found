'use client';

import { ShieldAlert, ShieldCheck, CheckCircle2, MessageCircle, Check } from 'lucide-react';
import type { LostReport } from '@/types/claims';
import { REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/types/claims';
import { formatDate } from '@/lib/date';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface LostReportDetailModalProps {
  report: LostReport | null;
  onClose: () => void;
  onOpenMarkFound: (report: LostReport) => void;
  onOpenCompleteHandover: (report: LostReport) => void;
  getWhatsAppVerificationUrl: (report: LostReport) => string | null;
}

export function LostReportDetailModal({
  report,
  onClose,
  onOpenMarkFound,
  onOpenCompleteHandover,
  getWhatsAppVerificationUrl,
}: LostReportDetailModalProps) {
  if (!report) return null;

  const statusColor = REPORT_STATUS_COLORS[report.status];

  return (
    <Modal
      open={Boolean(report)}
      onOpenChange={(open) => !open && onClose()}
      title="Detail Laporan Barang Hilang"
      description={`Nomor Laporan: ${report.report_code} · Tanggal Lapor: ${formatDate(report.created_at)}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Header / Item overview */}
        <div className="space-y-3 rounded-surface border border-line bg-surface-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {report.category}
            </span>
            <Badge variant="outline" className={`${statusColor.bg} ${statusColor.border} ${statusColor.text}`}>
              <span className={`size-1.5 rounded-full ${statusColor.dot}`} aria-hidden="true" />
              {REPORT_STATUS_LABELS[report.status]}
            </Badge>
          </div>
          <h3 className="text-balance text-lg font-semibold text-ink">{report.item_title}</h3>
          <div className="grid grid-cols-1 gap-1.5 text-[13px] leading-5 text-body sm:grid-cols-2">
            <p>
              <strong className="font-semibold text-ink">Lokasi Kejadian:</strong> {report.location}
            </p>
            <p>
              <strong className="font-semibold text-ink">Waktu Kejadian:</strong> {formatDate(report.incident_at)}
            </p>
          </div>
        </div>

        {/* Public Description */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Deskripsi Publik</h4>
          <p className="rounded-surface border border-line bg-surface p-3.5 text-[13px] leading-6 text-body">
            {report.public_description}
          </p>
        </div>

        {/* Private Description (Secret details) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="size-4 text-warning" aria-hidden="true" />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warning">
              Ciri Rahasia / Khusus (Kunci Verifikasi Petugas)
            </h4>
          </div>
          <div className="rounded-surface border border-warning/20 bg-warning-soft p-3.5 text-[13px] font-medium leading-6 text-ink">
            {report.private_description || 'Pelapor tidak menyertakan ciri rahasia tambahan.'}
          </div>
        </div>

        {/* Blind Verification SOP Checklist for petugas */}
        <div className="space-y-3 rounded-surface border border-info/20 bg-info-soft p-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-info">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span>SOP Verifikasi Pemilik (Blind Verification)</span>
          </div>
          <ul className="space-y-2.5 text-[13px] leading-5 text-body">
            <li className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink">
                1
              </span>
              <span><strong className="font-semibold text-ink">Uji lisan ciri rahasia:</strong> Jangan menyebutkan ciri khusus di atas. Minta pelapor menjelaskan sendiri detail privat barangnya.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink">
                2
              </span>
              <span><strong className="font-semibold text-ink">Uji akses perangkat:</strong> Jika barang berupa ponsel/laptop, minta pelapor membuka sandi/pola/biometrik di hadapan petugas.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink">
                3
              </span>
              <span><strong className="font-semibold text-ink">Periksa identitas resmi:</strong> Pastikan nama pada ID karyawan atau KTP sesuai dengan data pelapor: <em>{report.reporter?.full_name || 'Pelapor'}</em>.</span>
            </li>
          </ul>
        </div>

        {/* Reporter Profile */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Kontak Pelapor</h4>
          <div className="space-y-1 rounded-surface border border-line bg-surface-muted p-3.5 text-[13px] leading-5 text-body">
            <p><strong className="font-semibold text-ink">Nama:</strong> {report.reporter?.full_name || 'Pengguna'}</p>
            {report.reporter?.employee_id && <p><strong className="font-semibold text-ink">ID Karyawan:</strong> {report.reporter.employee_id}</p>}
            {report.reporter?.department && <p><strong className="font-semibold text-ink">Departemen:</strong> {report.reporter.department}</p>}
            {report.contact_phone && (
              <p>
                <strong className="font-semibold text-ink">No. HP / WhatsApp:</strong>{' '}
                <a
                  href={`https://wa.me/${report.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:text-brand hover:underline"
                >
                  {report.contact_phone}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Actions in modal */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Tutup
          </Button>
          {report.status === 'aktif' && (
            <Button
              onClick={() => onOpenMarkFound(report)}
              className="w-full sm:w-auto"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Tandai Barang Ditemukan
            </Button>
          )}
          {report.status === 'ditemukan' && (
            <>
              {report.contact_phone && (
                <a
                  href={getWhatsAppVerificationUrl(report) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full sm:w-auto"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Hubungi Pelapor via WA
                </a>
              )}
              <Button
                onClick={() => onOpenCompleteHandover(report)}
                className="w-full sm:w-auto"
              >
                <Check className="size-4" aria-hidden="true" />
                Verifikasi Selesai &amp; Serahkan
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
