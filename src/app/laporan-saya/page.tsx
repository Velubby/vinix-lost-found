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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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

  // Filtered reports for current category & status
  const currentCategoryReports = categoryTab === 'hilang' ? lostReports : foundReports;
  const filteredReports = useMemo(() => {
    if (statusFilter === 'semua') return currentCategoryReports;
    return currentCategoryReports.filter((r) => r.status === statusFilter);
  }, [currentCategoryReports, statusFilter]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
        <p className="text-sm font-semibold">Memuat riwayat laporan dan tiket Anda...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Pusat Aktivitas Anda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123356] mt-1">
            Laporan &amp; Klaim Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kelola barang pribadi yang hilang, barang temuan yang Anda bantu serahkan, dan status klaim tiket Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link href="/lapor" className="btn-primary text-xs flex items-center gap-2 min-h-11">
            <Plus className="w-4 h-4" />
            <span>Buat Laporan Baru</span>
          </Link>
          <Link href="/notifications" className="btn-secondary text-xs flex items-center gap-2 min-h-11">
            <Bell className="w-4 h-4" />
            <span>Notifikasi</span>
          </Link>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Category Switcher (3 Main Tabs) */}
      <nav aria-label="Pilihan Jenis Laporan" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setCategoryTab('hilang');
            setStatusFilter('semua');
          }}
          className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer relative overflow-hidden ${
            categoryTab === 'hilang'
              ? 'ring-2 ring-rose-600 border-rose-600 bg-rose-50/20 shadow-sm'
              : 'hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <PackageSearch className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">Barang Hilang Saya</span>
            </div>
            {activeLostCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white">
                {activeLostCount} aktif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Laporan barang milik Anda yang hilang dan sedang dicari di kantor.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCategoryTab('temuan');
            setStatusFilter('semua');
          }}
          className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer relative overflow-hidden ${
            categoryTab === 'temuan'
              ? 'ring-2 ring-sky-600 border-sky-600 bg-sky-50/20 shadow-sm'
              : 'hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <HandHeart className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">Barang Temuan Saya</span>
            </div>
            {activeFoundCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-sky-600 text-white">
                {activeFoundCount} aktif
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Barang milik orang lain yang Anda temukan dan serahkan ke pos/penyimpanan.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCategoryTab('klaim');
            setStatusFilter('semua');
          }}
          className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer relative overflow-hidden ${
            categoryTab === 'klaim'
              ? 'ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/20 shadow-sm'
              : 'hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-900">Klaim Barang Temuan</span>
            </div>
            {pendingClaimsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                {pendingClaimsCount} tiket
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Tiket bukti kepemilikan atas barang temuan yang Anda ajukan dari katalog.
          </p>
        </button>
      </nav>

      {/* Sub-filters for Lost / Found Reports */}
      {categoryTab !== 'klaim' && (
        <section aria-label="Filter Status Laporan" className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
            {(['semua', 'aktif', 'ditemukan', 'selesai', 'draf'] as FilterStatus[]).map((st) => {
              const label = st === 'semua' ? 'Semua Status' : REPORT_STATUS_LABELS[st];
              const count = st === 'semua' ? currentCategoryReports.length : currentCategoryReports.filter((r) => r.status === st).length;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-9.5 ${
                    statusFilter === st
                      ? 'bg-[#123356] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{label}</span>
                  <span className="ml-1.5 text-[11px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500">
            Menampilkan {filteredReports.length} laporan
          </span>
        </section>
      )}

      {/* REPORTS LIST (Barang Hilang / Barang Temuan) */}
      {categoryTab !== 'klaim' && (
        <div className="space-y-4">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => {
              const isMenunggu = (report.status as string) === 'Menunggu Penyerahan';
              const isFoundLostItem = report.type === 'hilang' && report.status === 'ditemukan';

              return (
                <article
                  key={report.id}
                  className={`apple-card p-5 sm:p-6 bg-white transition-shadow hover:shadow-md border ${
                    isFoundLostItem ? 'border-sky-300 ring-2 ring-sky-200/60' : 'border-slate-200/90'
                  }`}
                >
                  {/* Good news alert for lost items found by security */}
                  {isFoundLostItem && (
                    <div className="mb-4 rounded-xl bg-sky-50 border border-sky-200 p-3.5 flex items-start gap-3 text-sky-950 text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-sky-900 font-bold mb-0.5">
                          Kabar Baik! Barang Anda telah ditemukan dan diamankan di pos/penyimpanan.
                        </strong>
                        <span>
                          Silakan datang ke pos penyimpanan/pengambilan dengan membawa kartu identitas (ID karyawan/KTP) dan sebutkan ciri khusus barang untuk proses verifikasi serah terima.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Image & Main Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {report.image_url || (report.image_urls?.length ?? 0) > 0 ? (
                        <div className="relative flex flex-col gap-2 shrink-0">
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Image
                              src={report.image_url || report.image_urls?.[0] || ''}
                              alt={report.item_title}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                          {isMenunggu && (
                            <div className="absolute top-1 left-1 bg-rose-600 text-white text-[10px] font-bold rounded px-2">
                              Menunggu Penyerahan
                            </div>
                          )}
                          {report.image_urls?.slice(1).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Foto tambahan"
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                          <FileEdit className="w-8 h-8" />
                        </div>
                      )}

                      <div className="space-y-2 flex-1">
                        {/* Meta tags & Code */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(report.report_code)}
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md transition-colors"
                            title="Salin nomor laporan"
                          >
                            <span>{report.report_code}</span>
                            {copiedCode === report.report_code ? (
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          {/* Type badge */}
                          <Badge
                            variant="outline"
                            className={
                              report.type === 'hilang'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-sky-50 text-sky-700 border-sky-200'
                            }
                          >
                            {report.type === 'hilang' ? 'Barang Hilang' : 'Barang Temuan'}
                          </Badge>

                          {/* Status badge */}
                          <Badge
                            variant="outline"
                            className={
                              report.status === 'ditemukan'
                                ? 'bg-sky-100 text-sky-800 border-sky-300 font-bold'
                                : report.status === 'aktif'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : report.status === 'selesai'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }
                          >
                            {REPORT_STATUS_LABELS[report.status]}
                          </Badge>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-[#123356]">
                            {report.item_title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed max-w-xl line-clamp-2 mt-1">
                            {report.public_description}
                          </p>
                        </div>

                        {/* Location & Dates */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{report.location}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                            <span>{report.category}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Diperbarui {formatDate(report.updated_at)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      {report.status !== 'draf' && (
                        <Link
                          href={`/lacak?report=${report.id}`}
                          className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 min-h-10 w-full sm:w-auto"
                        >
                          <span>Lacak Status &amp; Linimasa</span>
                        </Link>
                      )}

                      {report.status === 'draf' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDraft(report.id)}
                            className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 min-h-10"
                            title="Hapus draf laporan"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            <span>Hapus Draf</span>
                          </Button>
                        </div>
                      )}

                      <a
                        href="mailto:lostfound@vinixsevenaurum.co.id?subject=Pertanyaan%20Status%20Laporan%20Lost%20%26%20Found"
                        className="btn-secondary text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 min-h-10 w-full sm:w-auto text-slate-700 hover:text-slate-900"
                        title="Hubungi petugas Lost &amp; Found"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Hubungi Petugas</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="apple-card p-12 text-center text-slate-500 bg-white">
              <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-3 text-base font-bold text-[#123356]">
                {categoryTab === 'hilang'
                  ? 'Belum ada laporan barang hilang'
                  : 'Belum ada laporan barang temuan'}
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {categoryTab === 'hilang'
                  ? 'Jika Anda kehilangan barang berharga di area kantor, buat laporan agar petugas dan karyawan dapat membantu proses pencarian.'
                  : 'Jika Anda menemukan barang milik orang lain di kantor, laporkan agar dapat segera dikembalikan ke pemiliknya.'}
              </p>
              <div className="mt-5">
                <Link
                  href="/lapor"
                  className="btn-primary text-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {categoryTab === 'hilang' ? 'Laporkan Barang Hilang' : 'Laporkan Barang Temuan'}
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLAIMS LIST (Tiket Klaim Barang Temuan dari Katalog) */}
      {categoryTab === 'klaim' && (
        <div className="space-y-4">
          {claims.length > 0 ? (
            claims.map((claim) => {
              const statusBadgeColor =
                claim.status === 'disetujui'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : claim.status === 'ditinjau'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : claim.status === 'ditolak'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200';

              return (
                <article
                  key={claim.id}
                  className="apple-card p-5 sm:p-6 bg-white transition-shadow hover:shadow-md border border-slate-200"
                >
                  {/* Approval notification box */}
                  {claim.status === 'disetujui' && (
                    <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-3 text-emerald-950 text-xs sm:text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-emerald-900 font-bold mb-0.5">
                          Klaim Disetujui! Barang siap diambil di lokasi pengambilan.
                        </strong>
                        <span>
                          Lokasi pengambilan: <strong>{claim.pickup_location || 'Resepsionis / Lobi Utama VINIX7'}</strong>. Bawa ID card/KTP dan tunjukkan tiket ini kepada petugas.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Item info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(claim.ticket_code)}
                          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md transition-colors"
                          title="Salin nomor tiket"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>Tiket {claim.ticket_code}</span>
                          {copiedCode === claim.ticket_code ? (
                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>

                        <Badge variant="outline" className={statusBadgeColor}>
                          {CLAIM_STATUS_LABELS[claim.status]}
                        </Badge>

                        <span className="text-xs text-slate-400">
                          Diajukan {formatDate(claim.created_at)}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-[#123356]">
                        {claim.item?.title || 'Barang Temuan di Katalog'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {claim.item?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>Lokasi ditemukan: {claim.item.location}</span>
                          </span>
                        )}
                        {claim.pickup_location && (
                          <span className="flex items-center gap-1 text-emerald-800 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Posko: {claim.pickup_location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <Link
                        href={`/lacak?ticket=${claim.ticket_code}`}
                        className="btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 min-h-10 w-full sm:w-auto"
                      >
                        <span>Buka Tiket Pengambilan</span>
                      </Link>

                      <Link
                        href={`/barang/${claim.item_id}`}
                        className="btn-secondary text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 min-h-10 w-full sm:w-auto text-slate-700 hover:text-slate-900"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Detail Barang</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="apple-card p-12 text-center text-slate-500 bg-white">
              <Ticket className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-3 text-base font-bold text-[#123356]">Belum ada tiket klaim</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Ketika Anda melihat barang milik Anda di katalog dan mengajukan bukti kepemilikan, tiket klaim akan muncul di sini.
              </p>
              <div className="mt-5">
                <Link href="/cari" className="btn-primary text-xs inline-flex items-center gap-2">
                  <PackageSearch className="w-4 h-4" />
                  <span>Jelajahi Katalog Barang Temuan</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
