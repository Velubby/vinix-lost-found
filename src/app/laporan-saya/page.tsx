'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Plus,
  FileEdit,
  Trash2,
  MapPin,
  Tag,
  Copy,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  MessageCircle,
  ExternalLink,
  PackageSearch,
  HandHeart,
  Ticket,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

import { formatDate } from '@/lib/date';
import {
  fetchUserReports,
  type UserReportRow,
  type ClaimRow,
  type ReportStatus,
} from '@/lib/supabase/reports';
import { REPORT_STATUS_COLORS, STATUS_COLORS } from '@/types/claims';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

type CategoryTab = 'hilang' | 'temuan' | 'klaim';
type FilterStatus = 'semua' | ReportStatus;

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  aktif: 'Dalam Pencarian',
  ditemukan: 'Ditemukan di Posko',
  selesai: 'Selesai (Diserahkan)',
  klaim: 'Proses Klaim',
  draf: 'Draf',
};

const CLAIM_STATUS_LABELS: Record<ClaimRow['status'], string> = {
  diajukan: 'Menunggu Verifikasi',
  ditinjau: 'Sedang Ditinjau',
  disetujui: 'Disetujui · Siap Diambil',
  ditolak: 'Ditolak',
};

const CATEGORY_TABS: Array<{
  id: CategoryTab;
  title: string;
  description: string;
}> = [
  {
    id: 'hilang',
    title: 'Barang Hilang Saya',
    description: 'Laporan barang milik Anda yang hilang dan sedang dicari di kantor.',
  },
  {
    id: 'temuan',
    title: 'Barang Temuan Saya',
    description: 'Barang milik orang lain yang Anda temukan dan serahkan ke pos/penyimpanan.',
  },
  {
    id: 'klaim',
    title: 'Klaim Barang Temuan',
    description: 'Tiket bukti kepemilikan atas barang temuan yang Anda ajukan dari katalog.',
  },
];

export default function MyReportsPage() {
  const router = useRouter();
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('hilang');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('semua');
  const [reports, setReports] = useState<UserReportRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchUserReports()
      .then(({ user, reports: userReports, claims: userClaims }) => {
        if (!user) {
          router.replace('/masuk?next=/laporan-saya');
          return;
        }
        setReports(userReports);
        setClaims(userClaims);
      })
      .catch(() => setError('Laporan belum dapat dimuat. Coba muat ulang halaman.'))
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Kode tiket ${code} disalin`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const deleteDraft = async (reportId: string) => {
    const { createClient } = await import('@/lib/supabase/client');
    const { error: deleteError } = await createClient().from('reports').delete().eq('id', reportId);
    if (deleteError) {
      toast.error('Draf belum dapat dihapus.');
      return;
    }
    toast.success('Draf laporan berhasil dihapus.');
    setReports((current) => current.filter((report) => report.id !== reportId));
  };

  // Counts per Category
  const lostReports = useMemo(() => reports.filter((r) => r.type === 'hilang'), [reports]);
  const foundReports = useMemo(() => reports.filter((r) => r.type === 'temuan'), [reports]);

  const activeLostCount = useMemo(() => lostReports.filter((r) => r.status === 'aktif' || r.status === 'ditemukan').length, [lostReports]);
  const activeFoundCount = useMemo(() => foundReports.filter((r) => r.status === 'aktif' || r.status === 'ditemukan').length, [foundReports]);
  const pendingClaimsCount = useMemo(() => claims.filter((c) => c.status === 'diajukan' || c.status === 'ditinjau' || c.status === 'disetujui').length, [claims]);

  const tabCount: Record<CategoryTab, number> = {
    hilang: activeLostCount,
    temuan: activeFoundCount,
    klaim: pendingClaimsCount,
  };
  const tabCountLabel: Record<CategoryTab, string> = {
    hilang: 'aktif',
    temuan: 'aktif',
    klaim: 'tiket',
  };

  // Filtered reports for current category & status
  const currentCategoryReports = categoryTab === 'hilang' ? lostReports : foundReports;
  const filteredReports = useMemo(() => {
    if (statusFilter === 'semua') return currentCategoryReports;
    return currentCategoryReports.filter((r) => r.status === statusFilter);
  }, [currentCategoryReports, statusFilter]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted sm:px-6 lg:px-8">
        <Clock className="mx-auto mb-3 size-8 animate-spin text-accent" aria-hidden="true" />
        <p className="text-sm font-medium">Memuat riwayat laporan dan tiket Anda...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Pusat Aktivitas Anda"
        title="Laporan & Klaim Saya"
        description="Kelola barang pribadi yang hilang, barang temuan yang Anda bantu serahkan, dan status klaim tiket Anda."
        actions={
          <>
            <Link href="/lapor" className="btn-primary">
              <Plus className="size-4" aria-hidden="true" />
              <span>Buat Laporan Baru</span>
            </Link>
            <Link href="/notifications" className="btn-secondary">
              <Bell className="size-4" aria-hidden="true" />
              <span>Notifikasi</span>
            </Link>
          </>
        }
      />

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Category Switcher (3 Main Tabs) */}
      <nav aria-label="Pilihan Jenis Laporan" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {CATEGORY_TABS.map((tab) => {
          const isActive = categoryTab === tab.id;
          const Icon = tab.id === 'hilang' ? PackageSearch : tab.id === 'temuan' ? HandHeart : Ticket;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setCategoryTab(tab.id);
                setStatusFilter('semua');
              }}
              aria-pressed={isActive}
              className={[
                'rounded-card border p-4 text-left transition-colors sm:p-5',
                isActive
                  ? 'border-brand bg-surface ring-1 ring-brand'
                  : 'border-line bg-surface hover:border-line-strong',
              ].join(' ')}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={[
                      'flex size-8 shrink-0 items-center justify-center rounded-surface',
                      isActive ? 'bg-brand text-inverse' : 'bg-surface-muted text-ink',
                    ].join(' ')}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-ink">{tab.title}</span>
                </div>
                {tabCount[tab.id] > 0 && (
                  <span className="shrink-0 rounded-pill bg-accent px-2 py-0.5 text-[11px] font-semibold text-inverse">
                    {tabCount[tab.id]} {tabCountLabel[tab.id]}
                  </span>
                )}
              </div>
              <p className="text-pretty text-xs leading-5 text-body">{tab.description}</p>
            </button>
          );
        })}
      </nav>

      {/* Sub-filters for Lost / Found Reports */}
      {categoryTab !== 'klaim' && (
        <section aria-label="Filter Status Laporan" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold text-muted">Status:</span>
            {(['semua', 'aktif', 'ditemukan', 'selesai', 'draf'] as FilterStatus[]).map((st) => {
              const label = st === 'semua' ? 'Semua Status' : REPORT_STATUS_LABELS[st];
              const count = st === 'semua' ? currentCategoryReports.length : currentCategoryReports.filter((r) => r.status === st).length;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  aria-pressed={statusFilter === st}
                  className={[
                    'inline-flex min-h-9 items-center rounded-pill border px-3 text-xs font-semibold transition-colors',
                    statusFilter === st
                      ? 'border-brand bg-brand text-inverse'
                      : 'border-line bg-surface text-body hover:border-line-strong hover:bg-surface-muted',
                  ].join(' ')}
                >
                  <span>{label}</span>
                  <span className="ml-1.5 tabular-nums opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-muted">Menampilkan {filteredReports.length} laporan</span>
        </section>
      )}

      {/* REPORTS LIST (Barang Hilang / Barang Temuan) */}
      {categoryTab !== 'klaim' && (
        <div className="space-y-4">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => {
              const isMenunggu = (report.status as string) === 'Menunggu Penyerahan';
              const isFoundLostItem = report.type === 'hilang' && report.status === 'ditemukan';
              const statusTone = REPORT_STATUS_COLORS[report.status];

              return (
                <article
                  key={report.id}
                  className={[
                    'rounded-card border bg-surface p-5 sm:p-6',
                    isFoundLostItem ? 'border-info/30 ring-1 ring-info/10' : 'border-line',
                  ].join(' ')}
                >
                  {/* Good news alert for lost items found by security */}
                  {isFoundLostItem && (
                    <div className="mb-4 flex items-start gap-3 rounded-surface border border-info/20 bg-info-soft p-4">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
                      <div className="space-y-0.5">
                        <strong className="block text-[13px] font-semibold text-ink">
                          Kabar Baik! Barang Anda telah ditemukan dan diamankan di pos/penyimpanan.
                        </strong>
                        <span className="block text-pretty text-[13px] leading-5 text-body">
                          Silakan datang ke pos penyimpanan/pengambilan dengan membawa kartu identitas (ID karyawan/KTP) dan sebutkan ciri khusus barang untuk proses verifikasi serah terima.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                    {/* Image & Main Info */}
                    <div className="flex flex-1 items-start gap-4">
                      {report.image_url || (report.image_urls?.length ?? 0) > 0 ? (
                        <div className="relative flex shrink-0 flex-col gap-2">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-surface border border-line bg-surface-muted sm:h-24 sm:w-24">
                            <Image
                              src={report.image_url || report.image_urls?.[0] || ''}
                              alt={report.item_title}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                          {isMenunggu && (
                            <div className="absolute left-1 top-1 rounded-control bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                              Menunggu Penyerahan
                            </div>
                          )}
                          {report.image_urls?.slice(1).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Foto tambahan"
                              className="h-12 w-12 shrink-0 rounded-surface border border-line bg-surface-muted object-cover sm:h-16 sm:w-16"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-surface border border-line bg-surface-muted text-muted sm:h-24 sm:w-24">
                          <FileEdit className="size-8" aria-hidden="true" />
                        </div>
                      )}

                      <div className="flex-1 space-y-2">
                        {/* Meta tags & Code */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(report.report_code)}
                            className="inline-flex min-h-7 items-center gap-1 rounded-control border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-body transition-colors hover:bg-surface hover:text-ink"
                            title="Salin nomor laporan"
                          >
                            <span className="tabular-nums">{report.report_code}</span>
                            {copiedCode === report.report_code ? (
                              <CheckCheck className="size-3 text-success" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3 text-muted" aria-hidden="true" />
                            )}
                          </button>

                          {/* Type badge */}
                          <span className="inline-flex items-center rounded-pill border border-line bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-body">
                            {report.type === 'hilang' ? 'Barang Hilang' : 'Barang Temuan'}
                          </span>

                          {/* Status badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone.bg} ${statusTone.text} ${statusTone.border}`}
                          >
                            <span className={`size-1.5 rounded-full ${statusTone.dot}`} aria-hidden="true" />
                            {REPORT_STATUS_LABELS[report.status]}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-balance text-[15px] font-semibold text-ink sm:text-base">
                            {report.item_title}
                          </h3>
                          <p className="mt-1 line-clamp-2 max-w-xl text-pretty text-[13px] leading-5 text-body">
                            {report.public_description}
                          </p>
                        </div>

                        {/* Location & Dates */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            <span>{report.location}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="size-3.5" aria-hidden="true" />
                            <span>{report.category}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" aria-hidden="true" />
                            <span>Diperbarui {formatDate(report.updated_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 border-t border-line pt-3 sm:flex-col sm:items-end lg:w-auto lg:border-t-0 lg:pt-0">
                      {report.status !== 'draf' && (
                        <Link
                          href={`/lacak?report=${report.id}`}
                          className="btn-primary w-full sm:w-56"
                        >
                          <span>Lacak Status &amp; Linimasa</span>
                        </Link>
                      )}

                      {report.status === 'draf' && (
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDraft(report.id)}
                            className="min-h-10 border-danger/30 text-danger hover:bg-danger-soft"
                            title="Hapus draf laporan"
                          >
                            <Trash2 className="mr-1 size-4" aria-hidden="true" />
                            <span>Hapus Draf</span>
                          </Button>
                        </div>
                      )}

                      <a
                        href="mailto:lostfound@vinixsevenaurum.co.id?subject=Pertanyaan%20Status%20Laporan%20Lost%20%26%20Found"
                        className="btn-secondary w-full sm:w-56"
                        title="Hubungi petugas Lost &amp; Found"
                      >
                        <MessageCircle className="size-4 text-muted" aria-hidden="true" />
                        <span>Hubungi Petugas</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              icon={<PackageSearch className="size-6" aria-hidden="true" />}
              title={
                categoryTab === 'hilang'
                  ? 'Belum ada laporan barang hilang'
                  : 'Belum ada laporan barang temuan'
              }
              description={
                categoryTab === 'hilang'
                  ? 'Jika Anda kehilangan barang berharga di area kantor, buat laporan agar petugas dan karyawan dapat membantu proses pencarian.'
                  : 'Jika Anda menemukan barang milik orang lain di kantor, laporkan agar dapat segera dikembalikan ke pemiliknya.'
              }
              action={
                <Link href="/lapor" className="btn-primary">
                  <Plus className="size-4" aria-hidden="true" />
                  <span>
                    {categoryTab === 'hilang' ? 'Laporkan Barang Hilang' : 'Laporkan Barang Temuan'}
                  </span>
                </Link>
              }
            />
          )}
        </div>
      )}

      {/* CLAIMS LIST (Tiket Klaim Barang Temuan dari Katalog) */}
      {categoryTab === 'klaim' && (
        <div className="space-y-4">
          {claims.length > 0 ? (
            claims.map((claim) => {
              const statusTone = STATUS_COLORS[claim.status];

              return (
                <article
                  key={claim.id}
                  className="rounded-card border border-line bg-surface p-5 sm:p-6"
                >
                  {/* Approval notification box */}
                  {claim.status === 'disetujui' && (
                    <div className="mb-4 flex items-start gap-3 rounded-surface border border-success/20 bg-success-soft p-4">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                      <div className="space-y-0.5">
                        <strong className="block text-[13px] font-semibold text-ink">
                          Klaim Disetujui! Barang siap diambil di lokasi pengambilan.
                        </strong>
                        <span className="block text-pretty text-[13px] leading-5 text-body">
                          Lokasi pengambilan: <strong className="font-semibold text-ink">{claim.pickup_location || 'Resepsionis / Lobi Utama VINIX7'}</strong>. Bawa ID card/KTP dan tunjukkan tiket ini kepada petugas.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                    {/* Item info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(claim.ticket_code)}
                          className="inline-flex min-h-7 items-center gap-1 rounded-control border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-body transition-colors hover:bg-surface hover:text-ink"
                          title="Salin nomor tiket"
                        >
                          <Ticket className="size-3.5" aria-hidden="true" />
                          <span className="tabular-nums">Tiket {claim.ticket_code}</span>
                          {copiedCode === claim.ticket_code ? (
                            <CheckCheck className="size-3 text-success" aria-hidden="true" />
                          ) : (
                            <Copy className="size-3 text-muted" aria-hidden="true" />
                          )}
                        </button>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold ${statusTone.bg} ${statusTone.text} ${statusTone.border}`}
                        >
                          <span className={`size-1.5 rounded-full ${statusTone.dot}`} aria-hidden="true" />
                          {CLAIM_STATUS_LABELS[claim.status]}
                        </span>

                        <span className="text-xs text-muted">
                          Diajukan {formatDate(claim.created_at)}
                        </span>
                      </div>

                      <h3 className="text-balance text-[15px] font-semibold text-ink sm:text-base">
                        {claim.item?.title || 'Barang Temuan di Katalog'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        {claim.item?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            <span>Lokasi ditemukan: {claim.item.location}</span>
                          </span>
                        )}
                        {claim.pickup_location && (
                          <span className="flex items-center gap-1 font-medium text-success">
                            <ShieldCheck className="size-3.5" aria-hidden="true" />
                            <span>Posko: {claim.pickup_location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 border-t border-line pt-3 sm:flex-col sm:items-end lg:w-auto lg:border-t-0 lg:pt-0">
                      <Link
                        href={`/lacak?ticket=${claim.ticket_code}`}
                        className="btn-primary w-full sm:w-56"
                      >
                        <span>Buka Tiket Pengambilan</span>
                      </Link>

                      <Link
                        href={`/barang/${claim.item_id}`}
                        className="btn-secondary w-full sm:w-56"
                      >
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                        <span>Detail Barang</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState
              icon={<Ticket className="size-6" aria-hidden="true" />}
              title="Belum ada tiket klaim"
              description="Ketika Anda melihat barang milik Anda di katalog dan mengajukan bukti kepemilikan, tiket klaim akan muncul di sini."
              action={
                <Link href="/cari" className="btn-primary">
                  <PackageSearch className="size-4" aria-hidden="true" />
                  <span>Jelajahi Katalog Barang Temuan</span>
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
