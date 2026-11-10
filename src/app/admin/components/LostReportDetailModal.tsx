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
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">{report.category}</span>
            <Badge variant="outline" className={`${REPORT_STATUS_COLORS[report.status].bg} ${REPORT_STATUS_COLORS[report.status].text}`}>
              {REPORT_STATUS_LABELS[report.status]}
            </Badge>
          </div>
          <h3 className="text-xl font-extrabold text-[#123356]">{report.item_title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
            <p><strong>Lokasi Kejadian:</strong> {report.location}</p>
            <p><strong>Waktu Kejadian:</strong> {formatDate(report.incident_at)}</p>
          </div>
        </div>

        {/* Public Description */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Deskripsi Publik</h4>
          <p className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
            {report.public_description}
          </p>
        </div>

        {/* Private Description (Secret details) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Ciri Rahasia / Khusus (Kunci Verifikasi Petugas)
            </h4>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950 leading-relaxed font-medium">
            {report.private_description || 'Pelapor tidak menyertakan ciri rahasia tambahan.'}
          </div>
        </div>

        {/* Blind Verification SOP Checklist for petugas */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sky-900 font-bold text-xs uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-sky-700" />
            <span>SOP Verifikasi Pemilik (Blind Verification)</span>
          </div>
          <ul className="text-xs text-sky-950 space-y-2 pl-1">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
              <span><strong>Uji lisan ciri rahasia:</strong> Jangan menyebutkan ciri khusus di atas. Minta pelapor menjelaskan sendiri detail privat barangnya.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
              <span><strong>Uji akses perangkat:</strong> Jika barang berupa ponsel/laptop, minta pelapor membuka sandi/pola/biometrik di hadapan petugas.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-200 text-sky-900 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
              <span><strong>Periksa identitas resmi:</strong> Pastikan nama pada ID karyawan atau KTP sesuai dengan data pelapor: <em>{report.reporter?.full_name || 'Pelapor'}</em>.</span>
            </li>
          </ul>
        </div>

        {/* Reporter Profile */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kontak Pelapor</h4>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <p><strong>Nama:</strong> {report.reporter?.full_name || 'Pengguna'}</p>
            {report.reporter?.employee_id && <p><strong>ID Karyawan:</strong> {report.reporter.employee_id}</p>}
            {report.reporter?.department && <p><strong>Departemen:</strong> {report.reporter.department}</p>}
            {report.contact_phone && (
              <p>
                <strong>No. HP / WhatsApp:</strong>{' '}
                <a
                  href={`https://wa.me/${report.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  {report.contact_phone}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Actions in modal */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          {report.status === 'aktif' && (
            <Button
              variant="primary"
              onClick={() => onOpenMarkFound(report)}
              className="bg-sky-700 hover:bg-sky-800"
            >
              <CheckCircle2 className="w-4 h-4" />
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
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Hubungi Pelapor via WA
                </a>
              )}
              <Button
                variant="primary"
                onClick={() => onOpenCompleteHandover(report)}
                className="bg-emerald-700 hover:bg-emerald-800"
              >
                <Check className="w-4 h-4" />
                Verifikasi Selesai & Serahkan
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
