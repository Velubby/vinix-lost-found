'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, CheckCircle2, Clock, MapPin, MessageSquare, Ticket, XCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { formatDate } from '@/lib/date';
import { fetchLatestUserReport, type ReportEventRow, type UserReportRow, type ClaimRow, type ClaimItemRow } from '@/lib/supabase/reports';
import { DEFAULT_PICKUP_LOCATION, OFFICE_ADDRESS, PICKUP_INSTRUCTIONS } from '@/lib/locations';

const CLAIM_STEPS = ['Klaim diajukan', 'Verifikasi petugas', 'Klaim disetujui', 'Barang diambil'];
const CLAIM_STATUS_LABELS: Record<ClaimRow['status'], string> = {
  diajukan: 'Menunggu verifikasi',
  ditinjau: 'Sedang ditinjau',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};
const CONTACT_EMAIL = 'mailto:lostfound@vinixsevenaurum.co.id';

function getReportProgress(report: Pick<UserReportRow, 'type' | 'status'>, claim?: ClaimRow | null) {
  const isFoundReport = report.type === 'temuan';
  const steps = isFoundReport
    ? ['Temuan dilaporkan', 'Menunggu Penyerahan', 'Menunggu Klaim', 'Verifikasi klaim', 'Selesai']
    : ['Laporan dibuat', 'Pencarian', 'Barang ditemukan', 'Verifikasi klaim', 'Selesai'];
  const statusIndex = {
    draf: 0,
    aktif: 1,
    ditemukan: 2,
    klaim: 3,
    selesai: steps.length - 1,
  }[report.status];
  const statusLabel = {
    draf: 'Draf',
    aktif: isFoundReport ? 'Menunggu Penyerahan' : 'Dalam pencarian',
    ditemukan: isFoundReport ? 'Menunggu Klaim' : 'Barang ditemukan',
    klaim: 'Verifikasi klaim',
    selesai: 'Laporan selesai',
  }[report.status];
  const description = {
    draf: 'Laporan masih berupa draf dan belum masuk proses penanganan.',
    aktif: isFoundReport
      ? 'Laporan temuan diterima. Silakan serahkan barang ke pos/penyimpanan untuk verifikasi.'
      : 'Laporan kehilangan aktif. Barang masih dalam pencarian.',
    ditemukan: isFoundReport
      ? 'Barang sudah aman di pos/penyimpanan dan tampil di katalog. Menunggu pemilik mengajukan klaim.'
      : 'Barang telah dinyatakan ditemukan. Kepemilikan perlu diverifikasi sebelum pengambilan.',
    klaim: isFoundReport
      ? claim?.status === 'disetujui'
        ? 'Klaim sudah disetujui. Barang menunggu diambil pemilik pada jam kerja kantor.'
        : 'Ada klaim kepemilikan yang perlu diverifikasi oleh petugas.'
      : 'Ada klaim kepemilikan yang perlu diverifikasi oleh petugas.',
    selesai: 'Laporan telah ditandai selesai. Lihat riwayat aktivitas untuk rincian penyelesaiannya.',
  }[report.status];

  return { steps, statusIndex, statusLabel, description };
}

function getClaimProgress(claim: ClaimRow) {
  const isHandedOver = Boolean(claim.pickup_at);
  const isRejected = claim.status === 'ditolak';
  const isApproved = claim.status === 'disetujui';
  const statusIndex = claim.status === 'diajukan' ? 0 : isRejected || claim.status === 'ditinjau' ? 1 : isHandedOver ? 3 : 2;

  const statusLabel = {
    diajukan: 'Menunggu verifikasi',
    ditinjau: 'Sedang ditinjau',
    disetujui: isHandedOver ? 'Selesai' : 'Klaim disetujui',
    ditolak: 'Klaim ditolak',
  }[claim.status];

  const description = {
    diajukan: 'Tiket klaim sudah diterima. Petugas akan mencocokkan ciri khusus yang kamu kirim dengan barang temuan.',
    ditinjau: 'Petugas sedang memeriksa ciri kepemilikan. Simpan nomor tiket ini sampai proses selesai.',
    disetujui: isHandedOver
      ? 'Barang sudah diserahkan. Simpan tiket ini sebagai bukti pengambilan.'
      : `Klaim disetujui. Silakan datang ke ${DEFAULT_PICKUP_LOCATION} pada jam kerja kantor dengan membawa ID card/KTP.`,
    ditolak: 'Ciri kepemilikan belum cocok dengan barang. Hubungi petugas untuk peninjauan ulang, atau ajukan klaim baru dengan bukti tambahan.',
  }[claim.status];

  return { statusIndex, statusLabel, description, isApproved, isRejected, isHandedOver };
}

function getClaimTimeline(claim: ClaimRow) {
  const timeline: ReportEventRow[] = [
    {
      id: 'claim-created',
      title: 'Klaim diajukan',
      description: `Tiket ${claim.ticket_code} diterima. Petugas akan memverifikasi ciri kepemilikan yang kamu kirim.`,
      created_at: claim.created_at,
    },
  ];

  if (claim.status === 'ditinjau') {
    timeline.push({
      id: 'claim-under-review',
      title: 'Ciri kepemilikan sedang diperiksa',
      description: 'Petugas mencocokkan ciri khusus yang kamu kirim dengan barang temuan.',
      created_at: claim.updated_at,
    });
  }

  if (claim.status === 'ditolak') {
    timeline.push({
      id: 'claim-rejected',
      title: 'Klaim ditolak',
      description: 'Ciri kepemilikan belum cocok. Barang kembali tampil di katalog temuan.',
      created_at: claim.updated_at,
    });
  }

  if (claim.status === 'disetujui') {
    const approvedAt = claim.approved_at ?? (claim.pickup_at ? null : claim.updated_at);
    if (approvedAt) {
      timeline.push({
        id: 'claim-approved',
        title: 'Klaim disetujui',
        description: `Barang menunggu diambil di ${claim.pickup_location ?? DEFAULT_PICKUP_LOCATION} pada jam kerja kantor. Bawa ID card/KTP.`,
        created_at: approvedAt,
      });
    }

    if (claim.pickup_at) {
      timeline.push({
        id: 'claim-handed-over',
        title: 'Barang sudah diambil',
        description: `Serah terima tiket ${claim.ticket_code} selesai. Simpan tiket ini sebagai bukti pengambilan.`,
        created_at: claim.pickup_at,
      });
    }
  }

  return timeline;
}

function TrackingStepper({
  label,
  steps,
  statusIndex,
  isFinished,
  isStopped,
}: {
  label: string;
  steps: string[];
  statusIndex: number;
  isFinished: boolean;
  isStopped: boolean;
}) {
  return (
    <ol aria-label={label} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-2">
      {steps.map((step, index) => {
        const isCurrent = index === statusIndex;
        const isComplete = index < statusIndex || (isCurrent && isFinished);
        const isStopStep = isStopped && isCurrent;
        const isFilled = isStopStep || index < statusIndex || (isCurrent && !isStopped);

        return (
          <li key={step} aria-current={isCurrent ? 'step' : undefined} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center">
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isStopStep
                  ? 'bg-rose-600 text-white'
                  : isFilled
                  ? 'bg-[#123356] text-white'
                  : 'border-2 border-slate-500 bg-white text-slate-600'
              }`}
            >
              {isComplete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className={`text-xs ${isStopStep ? 'font-bold text-rose-700' : isCurrent ? 'font-bold text-[#123356]' : 'text-slate-600'}`}>
              {step}
              <span className="sr-only">
                {isStopStep ? ', ditolak' : isComplete ? ', selesai' : isCurrent ? ', tahap saat ini' : ', belum dimulai'}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ActivityTimeline({ events }: { events: ReportEventRow[] }) {
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {events.map((event) => (
        <div key={event.id} className="relative">
          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#123356] bg-[#123356]" />
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
            <span className="text-[11px] text-slate-400 shrink-0">{formatDate(event.created_at)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.description}</p>
        </div>
      ))}
    </div>
  );
}

function TrackingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Accept legacy ?id= (old notification links) as alias for ?report=
  const requestedReportId = searchParams.get('report') || searchParams.get('id') || undefined;
  const requestedTicket = searchParams.get('ticket') || undefined;
  const [report, setReport] = useState<UserReportRow | null>(null);
  const [reports, setReports] = useState<UserReportRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [events, setEvents] = useState<ReportEventRow[]>([]);
  const [claim, setClaim] = useState<ClaimRow | null>(null);
  const [claimItem, setClaimItem] = useState<ClaimItemRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isClaimOwner, setIsClaimOwner] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError('');
    fetchLatestUserReport(requestedReportId, requestedTicket)
      .then((result) => {
        if (!result.user) {
          router.replace('/masuk?next=/lacak');
          return;
        }
        setReports(result.reports);
        setClaims(result.claims);
        setReport(result.report);
        setEvents(result.events);
        setClaim(result.claim);
        setClaimItem(result.claimItem);
        setIsClaimOwner((result as { isClaimOwner?: boolean }).isClaimOwner ?? true);
      })
      .catch(() => setError('Status laporan belum dapat dimuat.'))
      .finally(() => setIsLoading(false));
  }, [router, requestedReportId, requestedTicket]);

  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">Memuat status laporan...</div>;
  if (error) return <div role="alert" className="max-w-7xl mx-auto px-4 py-16 text-center text-rose-700">{error}</div>;

  if (!report) {
    if (!claim) return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-extrabold text-[#123356]">Belum ada laporan atau klaim</h1>
        <p className="text-sm text-slate-500">Buat laporan atau ajukan klaim kepemilikan untuk melihat proses penanganannya di sini.</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/lapor" className="btn-primary inline-flex text-xs">Buat Laporan</Link>
          <Link href="/cari" className="btn-secondary inline-flex text-xs">Cari Barang Temuan</Link>
        </div>
      </div>
    );

    const { statusIndex, statusLabel, description, isApproved, isRejected, isHandedOver } = getClaimProgress(claim);
    const timeline = getClaimTimeline(claim);
    const panelTone = isRejected
      ? 'bg-rose-50/80 border-rose-200'
      : isApproved
      ? 'bg-emerald-50/80 border-emerald-200'
      : 'bg-sky-50/80 border-sky-200';
    const titleTone = isRejected ? 'text-rose-900' : isApproved ? 'text-emerald-900' : 'text-sky-900';
    const bodyTone = isRejected ? 'text-rose-700' : isApproved ? 'text-emerald-700' : 'text-sky-700';
    const iconTone = isRejected ? 'text-rose-600' : isApproved ? 'text-emerald-600' : 'text-sky-600';
    const pillTone = isRejected ? 'bg-rose-100 text-rose-800' : isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800';

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123356]">Lacak Klaim Barang Temuan</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{isClaimOwner ? 'Status tiket pengambilan barang temuanmu tercatat di sini.' : 'Status klaim pada barang temuan yang kamu laporkan.'}</p>
          </div>
          {claims.length > 1 && (
            <label className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
              Pilih tiket
              <select
                value={claim.ticket_code}
                onChange={(event) => router.push(`/lacak?ticket=${event.target.value}`)}
                className="form-input ml-2 py-1.5 text-sm max-w-full min-w-0"
              >
                {claims.map((item) => (
                  <option key={item.id} value={item.ticket_code}>
                    {item.ticket_code} · {item.item?.title || 'Barang temuan'}
                  </option>
                ))}
              </select>
            </label>
          )}
          <a href={CONTACT_EMAIL} className="btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto">
            <MessageSquare className="w-4 h-4 text-slate-600" />
            <span>Hubungi Petugas</span>
          </a>
        </div>

        <div className="apple-card p-6 sm:p-8 space-y-8 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-2xl font-extrabold text-[#123356]">{claimItem?.title || claim.item?.title || 'Barang temuan'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tiket pengambilan · {claim.ticket_code}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-block ${pillTone}`}>SAAT INI · {statusLabel}</span>
          </div>

          <TrackingStepper label="Tahapan klaim" steps={CLAIM_STEPS} statusIndex={statusIndex} isFinished={isHandedOver} isStopped={isRejected} />

          <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${panelTone}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {isRejected ? <XCircle className={`w-6 h-6 shrink-0 ${iconTone}`} /> : isHandedOver ? <CheckCircle2 className={`w-6 h-6 shrink-0 ${iconTone}`} /> : <Clock className={`w-6 h-6 shrink-0 ${iconTone}`} />}
                <div>
                  <h3 className={`text-sm font-bold ${titleTone}`}>Status klaim: {statusLabel}</h3>
                  <p className={`text-xs mt-0.5 ${bodyTone}`}>{description}</p>
                  {claim.pickup_location && <p className={`text-xs mt-1 font-semibold ${bodyTone}`}>Lokasi pengambilan: {claim.pickup_location}</p>}
                </div>
              </div>
              {isApproved && !isHandedOver && isClaimOwner && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shrink-0">
                  <QRCode value={claim.ticket_code} size={112} />
                  <p className="mt-2 text-center text-[10px] font-semibold text-slate-500">Tunjukkan saat pengambilan</p>
                </div>
              )}
            </div>

            {isApproved && !isHandedOver && (
              <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 space-y-1">
                <p className="text-xs font-bold text-emerald-900">Ambil pada jam kerja kantor</p>
                <p className="text-xs text-emerald-800 leading-relaxed">{PICKUP_INSTRUCTIONS}</p>
              </div>
            )}

            {isRejected && (
              <a href={CONTACT_EMAIL} className="btn-secondary text-xs inline-flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-600" />
                <span>Email Petugas</span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 apple-card p-6 sm:p-8 space-y-6">
            <h3 className="text-base font-bold text-[#123356] pb-3 border-b border-slate-100">Riwayat Aktivitas</h3>
            <ActivityTimeline events={timeline} />
          </div>

          <div className="lg:col-span-4 apple-card p-6 space-y-5">
            <h3 className="text-base font-bold text-[#123356] pb-3 border-b border-slate-100">Informasi Klaim</h3>
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block">Nomor Tiket</span>
                <span className="font-bold text-slate-800 inline-flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5 text-slate-400" />{claim.ticket_code}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Lokasi Penemuan</span>
                <span className="font-bold text-slate-800 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{claimItem?.location || claim.item?.location || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Diajukan</span>
                <span className="font-bold text-slate-800">{formatDate(claim.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="font-bold text-slate-800">{statusLabel}</span>
              </div>
              {claim.approved_at && (
                <div>
                  <span className="text-slate-400 block">Disetujui</span>
                  <span className="font-bold text-slate-800">{formatDate(claim.approved_at)}</span>
                </div>
              )}
              {claim.pickup_at && (
                <div>
                  <span className="text-slate-400 block">Diambil</span>
                  <span className="font-bold text-slate-800">{formatDate(claim.pickup_at)}</span>
                </div>
              )}
              {claim.pickup_location && (
                <div>
                  <span className="text-slate-400 block">Lokasi Pengambilan</span>
                  <span className="font-bold text-slate-800">{claim.pickup_location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { steps, statusIndex, statusLabel, description } = getReportProgress(report, claim);
  const timeline = events.length > 0 ? events : [{ id: report.id, title: 'Laporan dibuat', description: 'Laporan berhasil diterima sistem.', created_at: report.created_at }];
  const shouldVisitPost = report.type === 'hilang' && report.status === 'ditemukan';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-extrabold text-[#123356]">Lacak Laporan {report.type === 'temuan' ? 'Temuan' : 'Kehilangan'}</h1><p className="text-xs sm:text-sm text-slate-500 mt-1">Pembaruan laporanmu tercatat di sini.</p></div>
        {reports.length > 1 && <label className="text-xs text-slate-600 flex flex-wrap items-center gap-2">Pilih laporan<select value={report?.id || ''} onChange={(event) => router.push(`/lacak?report=${event.target.value}`)} className="form-input ml-2 py-1.5 text-sm max-w-full min-w-0">{<option value="" disabled>Pilih laporan</option>}{reports.map((item) => <option key={item.id} value={item.id}>{item.report_code} · {item.item_title}</option>)}</select></label>}

        <a href={CONTACT_EMAIL} className="btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto"><MessageSquare className="w-4 h-4 text-slate-600" /><span>Hubungi Petugas</span></a>
      </div>

      <div className="apple-card p-6 sm:p-8 space-y-8 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100"><div><h2 className="text-2xl font-extrabold text-[#123356]">{report.item_title}</h2><p className="text-xs text-slate-500 mt-0.5">Nomor laporan · {report.report_code}</p></div><span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 uppercase tracking-wider inline-block">SAAT INI · {statusLabel}</span></div>
        <TrackingStepper label="Tahapan laporan" steps={steps} statusIndex={statusIndex} isFinished={report.status === 'selesai'} isStopped={false} />
        <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/80 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-sky-900">Status laporan: {statusLabel}</h3>
              <p className="text-xs text-sky-700 mt-0.5">{description}</p>
              {claim && (
                <p className="text-xs text-sky-700 mt-1">
                  Status klaim: {CLAIM_STATUS_LABELS[claim.status]} · Tiket pengambilan: {claim.ticket_code}{' '}
                  <Link href={`/lacak?ticket=${claim.ticket_code}`} className="font-bold underline underline-offset-2 hover:text-sky-900">
                    Lihat tiket
                  </Link>
                </p>
              )}
            </div>
          </div>
          {shouldVisitPost && (
            <div className="rounded-xl border border-sky-300 bg-white/80 px-4 py-3 space-y-1 sm:max-w-xs shrink-0">
              <p className="text-sm font-bold text-sky-900">Datang ke {DEFAULT_PICKUP_LOCATION}</p>
              <p className="text-xs text-sky-800 leading-relaxed">Lokasi kantor: {OFFICE_ADDRESS}. Bawa ID card/KTP dan sebutkan ciri khusus barang untuk verifikasi serah terima.</p>
              <Link href="/bantuan" className="text-xs font-bold text-sky-800 hover:text-sky-900 inline-flex items-center gap-1.5">
                Panduan pengambilan <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 apple-card p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-bold text-[#123356] pb-3 border-b border-slate-100">Riwayat Aktivitas</h3>
          <ActivityTimeline events={timeline} />
        </div>
        <div className="lg:col-span-4 apple-card p-6 space-y-5">
          <h3 className="text-base font-bold text-[#123356] pb-3 border-b border-slate-100">Informasi Laporan</h3>
          <div className="space-y-4 text-xs">
            <div><span className="text-slate-400 block">Lokasi Kejadian</span><span className="font-bold text-slate-800 text-sm">{report.location}</span></div>
            <div><span className="text-slate-400 block">Dilaporkan</span><span className="font-bold text-slate-800">{formatDate(report.created_at)}</span></div>
            <div><span className="text-slate-400 block">Kategori</span><span className="font-bold text-slate-800">{report.category}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">Memuat status laporan...</div>}><TrackingContent /></Suspense>;
}
