'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, CheckCircle2, Clock, MapPin, MessageSquare, Ticket, XCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { formatDate } from '@/lib/date';
import { fetchLatestUserReport, type ReportEventRow, type UserReportRow, type ClaimRow, type ClaimItemRow } from '@/lib/supabase/reports';
import { DEFAULT_PICKUP_LOCATION, OFFICE_ADDRESS, PICKUP_INSTRUCTIONS } from '@/lib/locations';
import { REPORT_STATUS_COLORS, STATUS_COLORS } from '@/types/claims';
import { PageHeader } from '@/components/ui/PageHeader';

const CLAIM_STEPS = ['Klaim diajukan', 'Verifikasi petugas', 'Klaim disetujui', 'Barang diambil'];
const CLAIM_STATUS_LABELS: Record<ClaimRow['status'], string> = {
  diajukan: 'Menunggu verifikasi',
  ditinjau: 'Sedang ditinjau',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
};
const CONTACT_EMAIL = 'mailto:lostfound@vinix7.id';

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
    <ol aria-label={label} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
      {steps.map((step, index) => {
        const isCurrent = index === statusIndex;
        const isComplete = index < statusIndex || (isCurrent && isFinished);
        const isStopStep = isStopped && isCurrent;
        const isFilled = isStopStep || index < statusIndex || (isCurrent && !isStopped);

        return (
          <li key={step} aria-current={isCurrent ? 'step' : undefined} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center">
            <span
              aria-hidden="true"
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isStopStep
                  ? 'bg-danger text-inverse'
                  : isFilled
                  ? 'bg-brand text-inverse'
                  : 'border border-line-strong bg-surface text-muted'
              }`}
            >
              {isComplete ? <Check className="size-4" /> : index + 1}
            </span>
            <span
              className={`text-xs leading-5 ${
                isStopStep
                  ? 'font-semibold text-danger'
                  : isCurrent
                  ? 'font-semibold text-ink'
                  : isComplete
                  ? 'text-body'
                  : 'text-muted'
              }`}
            >
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
    <div className="relative space-y-6 pl-5 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-line">
      {events.map((event) => (
        <div key={event.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-5 top-1.5 size-2 rounded-full bg-brand ring-4 ring-surface"
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h4 className="text-sm font-semibold text-ink">{event.title}</h4>
            <span className="shrink-0 text-xs tabular-nums text-muted">{formatDate(event.created_at)}</span>
          </div>
          <p className="mt-1 text-pretty text-[13px] leading-5 text-body">{event.description}</p>
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

  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted">Memuat status laporan...</div>;
  if (error) return <div role="alert" className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-danger">{error}</div>;

  if (!report) {
    if (!claim) return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-16 text-center">
        <h1 className="text-balance text-2xl font-semibold text-ink">Belum ada laporan atau klaim</h1>
        <p className="text-pretty text-sm leading-6 text-body">Buat laporan atau ajukan klaim kepemilikan untuk melihat proses penanganannya di sini.</p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Link href="/lapor" className="btn-primary inline-flex">Buat Laporan</Link>
          <Link href="/cari" className="btn-secondary inline-flex">Cari Barang Temuan</Link>
        </div>
      </div>
    );

    const { statusIndex, statusLabel, description, isApproved, isRejected, isHandedOver } = getClaimProgress(claim);
    const timeline = getClaimTimeline(claim);
    const panelTone = isRejected
      ? 'bg-danger-soft border-danger/20'
      : isApproved
      ? 'bg-success-soft border-success/20'
      : 'bg-info-soft border-info/20';
    const titleTone = isRejected ? 'text-danger' : isApproved ? 'text-success' : 'text-info';
    const pillTone = isRejected
      ? `${STATUS_COLORS.ditolak.bg} ${STATUS_COLORS.ditolak.text} ${STATUS_COLORS.ditolak.border}`
      : isApproved
      ? `${STATUS_COLORS.disetujui.bg} ${STATUS_COLORS.disetujui.text} ${STATUS_COLORS.disetujui.border}`
      : `${STATUS_COLORS.diajukan.bg} ${STATUS_COLORS.diajukan.text} ${STATUS_COLORS.diajukan.border}`;

    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <PageHeader
          title="Lacak Klaim Barang Temuan"
          description={isClaimOwner ? 'Status tiket pengambilan barang temuanmu tercatat di sini.' : 'Status klaim pada barang temuan yang kamu laporkan.'}
          actions={
            <>
              {claims.length > 1 && (
                <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-72">
                  Pilih tiket
                  <select
                    value={claim.ticket_code}
                    onChange={(event) => router.push(`/lacak?ticket=${event.target.value}`)}
                    className="form-input min-h-11 w-full min-w-0 py-2 text-sm"
                  >
                    {claims.map((item) => (
                      <option key={item.id} value={item.ticket_code}>
                        {item.ticket_code} · {item.item?.title || 'Barang temuan'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <a href={CONTACT_EMAIL} className="btn-secondary">
                <MessageSquare className="size-4" aria-hidden="true" />
                <span>Hubungi Petugas</span>
              </a>
            </>
          }
        />

        <div className="space-y-8 rounded-card border border-line bg-surface p-5 sm:p-8">
          <div className="flex flex-col justify-between gap-3 border-b border-line pb-5 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="text-balance text-xl font-semibold leading-7 text-ink">{claimItem?.title || claim.item?.title || 'Barang temuan'}</h2>
              <p className="mt-1 text-[13px] text-muted">
                Tiket pengambilan · <span className="tabular-nums">{claim.ticket_code}</span>
              </p>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${pillTone}`}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              SAAT INI · {statusLabel}
            </span>
          </div>

          <TrackingStepper label="Tahapan klaim" steps={CLAIM_STEPS} statusIndex={statusIndex} isFinished={isHandedOver} isStopped={isRejected} />

          <div className={`space-y-4 rounded-surface border p-4 sm:p-5 ${panelTone}`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-start gap-3">
                {isRejected ? (
                  <XCircle className={`mt-0.5 size-5 shrink-0 ${titleTone}`} aria-hidden="true" />
                ) : isHandedOver ? (
                  <CheckCircle2 className={`mt-0.5 size-5 shrink-0 ${titleTone}`} aria-hidden="true" />
                ) : (
                  <Clock className={`mt-0.5 size-5 shrink-0 ${titleTone}`} aria-hidden="true" />
                )}
                <div>
                  <h3 className={`text-sm font-semibold ${titleTone}`}>Status klaim: {statusLabel}</h3>
                  <p className="mt-1 text-pretty text-[13px] leading-5 text-body">{description}</p>
                  {claim.pickup_location && (
                    <p className="mt-1 text-[13px] font-medium text-body">Lokasi pengambilan: {claim.pickup_location}</p>
                  )}
                </div>
              </div>
              {isApproved && !isHandedOver && isClaimOwner && (
                <div className="shrink-0 rounded-surface border border-line bg-surface p-3">
                  <QRCode value={claim.ticket_code} size={112} />
                  <p className="mt-2 text-center text-xs font-medium text-muted">Tunjukkan saat pengambilan</p>
                </div>
              )}
            </div>

            {isApproved && !isHandedOver && (
              <div className="space-y-1 rounded-surface border border-success/20 bg-surface px-4 py-3">
                <p className="text-[13px] font-semibold text-success">Ambil pada jam kerja kantor</p>
                <p className="text-pretty text-[13px] leading-5 text-body">{PICKUP_INSTRUCTIONS}</p>
              </div>
            )}

            {isRejected && (
              <a href={CONTACT_EMAIL} className="btn-secondary">
                <MessageSquare className="size-4" aria-hidden="true" />
                <span>Email Petugas</span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 rounded-card border border-line bg-surface p-5 sm:p-8 lg:col-span-8">
            <h3 className="border-b border-line pb-3 text-base font-semibold text-ink">Riwayat Aktivitas</h3>
            <ActivityTimeline events={timeline} />
          </div>

          <div className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6 lg:col-span-4">
            <h3 className="border-b border-line pb-3 text-base font-semibold text-ink">Informasi Klaim</h3>
            <dl className="space-y-4 text-[13px]">
              <div>
                <dt className="text-xs text-muted">Nomor Tiket</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1.5 font-semibold tabular-nums text-ink">
                  <Ticket className="size-3.5 text-muted" aria-hidden="true" />
                  {claim.ticket_code}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Lokasi Penemuan</dt>
                <dd className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-ink">
                  <MapPin className="size-3.5 text-muted" aria-hidden="true" />
                  {claimItem?.location || claim.item?.location || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Diajukan</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatDate(claim.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd className="mt-0.5 font-semibold text-ink">{statusLabel}</dd>
              </div>
              {claim.approved_at && (
                <div>
                  <dt className="text-xs text-muted">Disetujui</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatDate(claim.approved_at)}</dd>
                </div>
              )}
              {claim.pickup_at && (
                <div>
                  <dt className="text-xs text-muted">Diambil</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatDate(claim.pickup_at)}</dd>
                </div>
              )}
              {claim.pickup_location && (
                <div>
                  <dt className="text-xs text-muted">Lokasi Pengambilan</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{claim.pickup_location}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    );
  }

  const { steps, statusIndex, statusLabel, description } = getReportProgress(report, claim);
  const timeline = events.length > 0 ? events : [{ id: report.id, title: 'Laporan dibuat', description: 'Laporan berhasil diterima sistem.', created_at: report.created_at }];
  const shouldVisitPost = report.type === 'hilang' && report.status === 'ditemukan';
  const reportTone = REPORT_STATUS_COLORS[report.status];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title={`Lacak Laporan ${report.type === 'temuan' ? 'Temuan' : 'Kehilangan'}`}
        description="Pembaruan laporanmu tercatat di sini."
        actions={
          <>
            {reports.length > 1 && (
              <label className="flex w-full flex-col gap-1 text-xs text-muted sm:w-72">
                Pilih laporan
                <select
                  value={report?.id || ''}
                  onChange={(event) => router.push(`/lacak?report=${event.target.value}`)}
                  className="form-input min-h-11 w-full min-w-0 py-2 text-sm"
                >
                  <option value="" disabled>Pilih laporan</option>
                  {reports.map((item) => (
                    <option key={item.id} value={item.id}>{item.report_code} · {item.item_title}</option>
                  ))}
                </select>
              </label>
            )}
            <a href={CONTACT_EMAIL} className="btn-secondary">
              <MessageSquare className="size-4" aria-hidden="true" />
              <span>Hubungi Petugas</span>
            </a>
          </>
        }
      />

      <div className="space-y-8 rounded-card border border-line bg-surface p-5 sm:p-8">
        <div className="flex flex-col justify-between gap-3 border-b border-line pb-5 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="text-balance text-xl font-semibold leading-7 text-ink">{report.item_title}</h2>
            <p className="mt-1 text-[13px] text-muted">
              Nomor laporan · <span className="tabular-nums">{report.report_code}</span>
            </p>
          </div>
          <span className={`inline-flex w-fit items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${reportTone.bg} ${reportTone.text} ${reportTone.border}`}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            SAAT INI · {statusLabel}
          </span>
        </div>

        <TrackingStepper label="Tahapan laporan" steps={steps} statusIndex={statusIndex} isFinished={report.status === 'selesai'} isStopped={false} />

        <div className={`flex flex-col justify-between gap-4 rounded-surface border p-4 sm:flex-row sm:items-center sm:p-5 ${reportTone.bg} ${reportTone.border}`}>
          <div className="flex items-start gap-3 sm:items-center">
            <CheckCircle2 className={`mt-0.5 size-5 shrink-0 sm:mt-0 ${reportTone.text}`} aria-hidden="true" />
            <div>
              <h3 className={`text-sm font-semibold ${reportTone.text}`}>Status laporan: {statusLabel}</h3>
              <p className="mt-1 text-pretty text-[13px] leading-5 text-body">{description}</p>
              {claim && (
                <p className="mt-1 text-[13px] leading-5 text-body">
                  Status klaim: {CLAIM_STATUS_LABELS[claim.status]} · Tiket pengambilan: <span className="tabular-nums">{claim.ticket_code}</span>{' '}
                  <Link href={`/lacak?ticket=${claim.ticket_code}`} className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:text-brand">
                    Lihat tiket
                  </Link>
                </p>
              )}
            </div>
          </div>
          {shouldVisitPost && (
            <div className="shrink-0 space-y-1 rounded-surface border border-line bg-surface px-4 py-3 sm:max-w-xs">
              <p className="text-sm font-semibold text-ink">Datang ke {DEFAULT_PICKUP_LOCATION}</p>
              <p className="text-pretty text-[13px] leading-5 text-body">Lokasi kantor: {OFFICE_ADDRESS}. Bawa ID card/KTP dan sebutkan ciri khusus barang untuk verifikasi serah terima.</p>
              <Link href="/bantuan" className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-brand">
                Panduan pengambilan <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-6 rounded-card border border-line bg-surface p-5 sm:p-8 lg:col-span-8">
          <h3 className="border-b border-line pb-3 text-base font-semibold text-ink">Riwayat Aktivitas</h3>
          <ActivityTimeline events={timeline} />
        </div>
        <div className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6 lg:col-span-4">
          <h3 className="border-b border-line pb-3 text-base font-semibold text-ink">Informasi Laporan</h3>
          <dl className="space-y-4 text-[13px]">
            <div>
              <dt className="text-xs text-muted">Lokasi Kejadian</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{report.location}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Dilaporkan</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-ink">{formatDate(report.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Kategori</dt>
              <dd className="mt-0.5 font-semibold text-ink">{report.category}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted">
          Memuat status laporan...
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
