'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, RefreshCw, Clock, PackageCheck, MapPin, Calendar } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { checkIsStaff } from '@/lib/supabase/auth';
import type { Claim, FilterStatus, LostReport, FilterReportStatus } from '@/types/claims';
import { fetchLostReportsAction, updateReportStatusAction, getAdminTabCountsAction } from '@/app/admin/actions';
import { useClaims, useClaimStats, useUpdateClaim, useBulkUpdateClaims, useMarkClaimHandedOver } from '@/hooks/useClaims';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';

import { AdminStatsOverview } from './components/AdminStatsOverview';
import { AdminClaimsView } from './components/AdminClaimsView';
import { AdminReportsView } from './components/AdminReportsView';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { RejectClaimModal } from './components/RejectClaimModal';
import { CustodyChainModal } from './components/CustodyChainModal';
import { LostReportDetailModal } from './components/LostReportDetailModal';
import { DEFAULT_PICKUP_LOCATION, PICKUP_LOCATIONS } from '@/lib/locations';

const QUICK_LOCATIONS = PICKUP_LOCATIONS;

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Authentication & Role Check
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'klaim' | 'laporan-hilang' | 'konfirmasi'>('klaim');

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('semua');
  const [reportStatusFilter, setReportStatusFilter] = useState<FilterReportStatus>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [viewingClaim, setViewingClaim] = useState<Claim | null>(null);
  const [rejectingClaim, setRejectingClaim] = useState<Claim | null>(null);
  const [isBulkApproveOpen, setIsBulkApproveOpen] = useState(false);
  const [bulkPickupLocation, setBulkPickupLocation] = useState(DEFAULT_PICKUP_LOCATION);
  const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);

  // Report Modals State
  const [viewingReport, setViewingReport] = useState<LostReport | null>(null);
  const [markingFoundReport, setMarkingFoundReport] = useState<LostReport | null>(null);
  const [completingReport, setCompletingReport] = useState<LostReport | null>(null);
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const [confirmingReportId, setConfirmingReportId] = useState<string | null>(null);

  // Copy Feedback
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Verify staff role
  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/masuk?next=/admin');
        return;
      }

      const isAuthorized = await checkIsStaff(user.id);
      if (!isAuthorized) {
        toast.error('Akses ditolak: halaman ini khusus admin.');
        router.replace('/dashboard');
        return;
      }

      setIsStaff(true);
    };

    checkRole();
  }, [router]);

  // Queries & Mutations
  const {
    data: claimsData,
    isLoading: isClaimsLoading,
    isFetching: isClaimsFetching,
    error: claimsError,
    refetch: refetchClaims,
  } = useClaims(
    { status: statusFilter, search: debouncedSearch, limit: 50 },
    { enabled: isStaff === true }
  );

  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useClaimStats({ enabled: isStaff === true });

  const { data: tabCounts, refetch: refetchTabCounts } = useQuery({
    queryKey: ['adminTabCounts'],
    queryFn: async () => {
      const res = await getAdminTabCountsAction();
      if (!res.success) {
        throw new Error(res.error);
      }
      return res.data;
    },
    enabled: isStaff === true,
  });

  const updateClaimMutation = useUpdateClaim({
    onSuccess: () => {
      toast.success('Status klaim berhasil diperbarui');
      setViewingClaim(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal memperbarui status klaim');
    },
  });

  const bulkUpdateMutation = useBulkUpdateClaims({
    onSuccess: (res) => {
      toast.success(`${res.data.updated} klaim berhasil diperbarui`);
      setSelectedIds([]);
      setIsBulkApproveOpen(false);
      setIsBulkRejectOpen(false);
      setBulkPickupLocation(DEFAULT_PICKUP_LOCATION);
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal memperbarui klaim secara massal');
    },
  });

  const handoverMutation = useMarkClaimHandedOver({
    onSuccess: () => {
      toast.success('Serah terima berhasil dicatat');
      setViewingClaim(null);
      refetchLostReports();
      refetchTabCounts();
    },
    onError: (err) => {
      toast.error(err.message || 'Gagal mencatat serah terima');
    },
  });

  const claims = useMemo(() => claimsData?.claims || [], [claimsData]);

  // Lost Reports Query
  const {
    data: lostReportsData,
    isLoading: isReportsLoading,
    isFetching: isReportsFetching,
    error: reportsQueryError,
    refetch: refetchLostReports,
  } = useQuery({
    queryKey: ['lostReports', reportStatusFilter, debouncedSearch, activeTab],
    queryFn: async () => {
      const typeFilter = activeTab === 'konfirmasi' ? 'temuan' : 'hilang';
      const status = activeTab === 'konfirmasi' ? 'semua' : reportStatusFilter;
      const res = await fetchLostReportsAction(undefined, 50, status, debouncedSearch, typeFilter);
      if (!res.success) {
        throw new Error(res.error || 'Gagal memuat laporan');
      }
      return res.data;
    },
    enabled: isStaff === true && (activeTab === 'laporan-hilang' || activeTab === 'konfirmasi'),
  });

  const lostReports = useMemo(() => lostReportsData?.reports || [], [lostReportsData]);
  const foundReports = useMemo(() => lostReportsData?.reports?.filter((r) => r.type === 'temuan') || [], [lostReportsData]);
  const pendingHandoverReports = useMemo(() => foundReports.filter((r) => !r.diterima_di_pos), [foundReports]);
  const reportsError = reportsQueryError ? (reportsQueryError as Error).message : null;

  // Processable claims selection
  const processableVisibleClaims = useMemo(() => {
    return claims.filter((c) => c.status === 'diajukan' || c.status === 'ditinjau');
  }, [claims]);

  const allProcessableSelected =
    processableVisibleClaims.length > 0 &&
    processableVisibleClaims.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allProcessableSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processableVisibleClaims.map((c) => c.id));
    }
  };

  const toggleSelectClaim = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyTicket = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTicket(code);
    toast.success(`Kode tiket ${code} disalin`);
    setTimeout(() => setCopiedTicket(null), 2000);
  };

  const handleSingleUpdate = (claimId: string, status: 'ditinjau' | 'disetujui' | 'ditolak', location?: string) => {
    updateClaimMutation.mutate({
      claimId,
      status,
      pickupLocation: status === 'disetujui' ? location || DEFAULT_PICKUP_LOCATION : undefined,
    });
  };

  const handleMarkHandedOver = (claimId: string) => {
    handoverMutation.mutate({ claimId });
  };

  const handleConfirmReject = (claim: Claim, reason: string) => {
    updateClaimMutation.mutate(
      {
        claimId: claim.id,
        status: 'ditolak',
        rejectReason: reason || undefined,
      },
      {
        onSuccess: () => {
          setRejectingClaim(null);
          if (viewingClaim?.id === claim.id) {
            setViewingClaim((prev) => (prev ? { ...prev, status: 'ditolak' } : null));
          }
        },
      }
    );
  };

  const handleBulkApprove = () => {
    if (!bulkPickupLocation.trim()) {
      toast.error('Tentukan lokasi pengambilan barang terlebih dahulu');
      return;
    }
    bulkUpdateMutation.mutate({
      claimIds: selectedIds,
      status: 'disetujui',
      pickupLocation: bulkPickupLocation.trim(),
    });
  };

  const handleBulkReject = () => {
    bulkUpdateMutation.mutate({
      claimIds: selectedIds,
      status: 'ditolak',
    });
  };

  const handleBulkMarkReview = () => {
    bulkUpdateMutation.mutate({
      claimIds: selectedIds,
      status: 'ditinjau',
    });
  };

  const handleConfirmMarkFound = async (data: {
    finderName: string;
    foundLocation: string;
    storageLocation: string;
    note: string;
  }) => {
    if (!markingFoundReport) return;
    setIsUpdatingReport(true);
    try {
      const res = await updateReportStatusAction({
        reportId: markingFoundReport.id,
        status: 'ditemukan',
        finderName: data.finderName || undefined,
        foundLocation: data.foundLocation || undefined,
        storageLocation: data.storageLocation || undefined,
        note: data.note || undefined,
      });
      if (res.success) {
        toast.success('Barang berhasil dicatat & status diubah ke "Ditemukan"');
        if (viewingReport && viewingReport.id === markingFoundReport.id) {
          setViewingReport((prev) => (prev ? { ...prev, status: 'ditemukan' } : null));
        }
        setMarkingFoundReport(null);
        queryClient.invalidateQueries({ queryKey: ['lostReports'] });
        queryClient.invalidateQueries({ queryKey: ['adminTabCounts'] });
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal mengubah status laporan');
      }
    } catch {
      toast.error('Terjadi kesalahan mengubah status');
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleConfirmCompleteReport = async () => {
    if (!completingReport) return;
    setIsUpdatingReport(true);
    try {
      const res = await updateReportStatusAction({
        reportId: completingReport.id,
        status: 'selesai',
        note: 'Verifikasi identitas dan ciri kepemilikan berhasil. Barang telah diserahkan kembali kepada pemilik.',
      });
      if (res.success) {
        toast.success('Serah terima selesai! Status laporan diperbarui.');
        if (viewingReport && viewingReport.id === completingReport.id) {
          setViewingReport((prev) => (prev ? { ...prev, status: 'selesai' } : null));
        }
        setCompletingReport(null);
        queryClient.invalidateQueries({ queryKey: ['lostReports'] });
        queryClient.invalidateQueries({ queryKey: ['adminTabCounts'] });
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal menyelesaikan laporan');
      }
    } catch {
      toast.error('Terjadi kesalahan menyelesaikan laporan');
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const getWhatsAppVerificationUrl = (report: LostReport) => {
    if (!report.contact_phone) return null;
    const phone = report.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '');
    const reporterName = report.reporter?.full_name || 'Pelapor';
    const text = `Halo Sdr/i ${reporterName},\nKami dari petugas Lost & Found kantor menginfokan bahwa barang yang sesuai dengan laporan kehilangan Anda ("${report.item_title}", No. Laporan: ${report.report_code}) telah ditemukan dan diamankan.\n\nSilakan datang ke lokasi pengambilan/penyimpanan yang diinformasikan dengan membawa kartu identitas (ID karyawan/KTP) dan bersiap menyebutkan/membuktikan ciri kepemilikan barang untuk proses serah terima.\n\nTerima kasih.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  const handleConfirmItemHandover = async (report: LostReport) => {
    setConfirmingReportId(report.id);
    try {
      const res = await updateReportStatusAction({
        reportId: report.id,
        status: 'ditemukan',
        finderName: report.reporter?.full_name || 'Pelapor/Petugas',
        storageLocation: DEFAULT_PICKUP_LOCATION,
        note: 'Barang diterima dan diverifikasi oleh petugas di posko',
      });

      if (res.success) {
        toast.success(`Barang "${report.item_title}" berhasil dikonfirmasi dan dimasukkan ke katalog.`);
        await queryClient.invalidateQueries({ queryKey: ['lostReports'] });
        await queryClient.invalidateQueries({ queryKey: ['adminTabCounts'] });
        router.refresh();
      } else {
        toast.error(res.error || 'Gagal mengonfirmasi penyerahan barang');
      }
    } catch (err) {
      console.error('Error confirming item handover:', err);
      toast.error('Terjadi kesalahan saat mengonfirmasi barang');
    } finally {
      setConfirmingReportId(null);
    }
  };

  const handleRefresh = () => {
    refetchTabCounts();
    if (activeTab === 'klaim') {
      refetchClaims();
      refetchStats();
      toast.info('Memperbarui data klaim...');
    } else {
      refetchLostReports();
      toast.info('Memperbarui data laporan kehilangan...');
    }
  };

  if (isStaff === null) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Memeriksa hak akses admin...
      </div>
    );
  }

  if (isStaff === false) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-sky-800">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Ruang Kerja Admin
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123356] mt-1">
            {activeTab === 'klaim' ? 'Verifikasi Klaim Barang' : 'Daftar Laporan Barang Hilang'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {activeTab === 'klaim'
              ? 'Cocokkan ciri rahasia dari pemohon sebelum menyetujui serah terima barang temuan.'
              : 'Pantau dan kelola laporan kehilangan yang diajukan karyawan.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={isClaimsFetching || isReportsFetching}
            className="min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${isClaimsFetching || isReportsLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </Button>
        </div>
      </header>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('klaim')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'klaim'
              ? 'bg-[#123356] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span>Klaim Barang Temuan</span>
          <span
            className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums ${
              activeTab === 'klaim'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tabCounts?.claims ?? stats?.pending ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('laporan-hilang')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'laporan-hilang'
              ? 'bg-[#123356] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span>Laporan Barang Hilang</span>
          <span
            className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums ${
              activeTab === 'laporan-hilang'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tabCounts?.lostReports ?? 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('konfirmasi')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'konfirmasi'
              ? 'bg-[#123356] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
        >
          <span>Konfirmasi Barang</span>
          <span
            className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full text-[11px] font-extrabold tabular-nums ${
              activeTab === 'konfirmasi'
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {tabCounts?.confirmations ?? 0}
          </span>
        </button>
      </div>

      {activeTab === 'konfirmasi' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#123356]">Konfirmasi Penyerahan Barang</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Daftar barang temuan yang dilaporkan karyawan dan menunggu verifikasi fisik di pos/penyimpanan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetchLostReports()}
              className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReportsFetching ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {isReportsLoading ? (
            <div className="apple-card p-12 text-center text-slate-500 bg-white border border-slate-200/90 rounded-2xl">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
              <p className="text-sm font-medium">Sedang memuat data barang temuan...</p>
            </div>
          ) : pendingHandoverReports.length === 0 ? (
            <div className="apple-card p-12 text-center text-slate-500 bg-white border border-slate-200/90 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <PackageCheck className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-800">Tidak ada barang yang menunggu penyerahan</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Semua barang temuan yang dilaporkan telah dikonfirmasi dan diamankan di pos/penyimpanan.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingHandoverReports.map((report) => (
                <article
                  key={report.id}
                  className="apple-card p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    {/* Image & Main Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {report.image_url || (report.image_urls?.length ?? 0) > 0 ? (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <Image
                            src={report.image_url || report.image_urls?.[0] || ''}
                            alt={report.item_title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 shrink-0 border border-slate-200 flex items-center justify-center">
                          <Clock className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200/60">
                            {report.category}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {report.report_code}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-[#123356] truncate">
                          {report.item_title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {report.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(report.incident_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {report.public_description && (
                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {report.public_description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Menunggu Penyerahan
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConfirmItemHandover(report)}
                        disabled={confirmingReportId === report.id}
                        className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        {confirmingReportId === report.id ? (
                          <>
                            <span className="w-3.5 h-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          'Tandai Diterima di Pos'
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: KLAIM */}
      {activeTab === 'klaim' && (
        <div className="space-y-6">
          <AdminStatsOverview
            stats={stats}
            statusFilter={statusFilter}
            onSelectFilter={setStatusFilter}
            isLoading={isStatsLoading}
          />

          <AdminClaimsView
            claims={claims}
            isLoading={isClaimsLoading}
            claimsError={claimsError}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            stats={stats}
            selectedIds={selectedIds}
            onToggleSelectClaim={toggleSelectClaim}
            onToggleSelectAll={toggleSelectAll}
            allProcessableSelected={allProcessableSelected}
            processableVisibleCount={processableVisibleClaims.length}
            onOpenDetail={setViewingClaim}
            onOpenRejectModal={setRejectingClaim}
            onSingleUpdate={handleSingleUpdate}
            onMarkHandedOver={handleMarkHandedOver}
            isMarkingHandedOver={handoverMutation.isPending}
            onCopyTicket={handleCopyTicket}
            copiedTicket={copiedTicket}
            onBulkMarkReview={handleBulkMarkReview}
            onBulkApproveOpen={() => setIsBulkApproveOpen(true)}
            onBulkRejectOpen={() => setIsBulkRejectOpen(true)}
            onClearSelection={() => setSelectedIds([])}
            isBulkUpdating={bulkUpdateMutation.isPending}
            isUpdatingSingle={updateClaimMutation.isPending}
            onRetry={handleRefresh}
          />
        </div>
      )}

      {/* TAB 2: LAPORAN HILANG */}
      {activeTab === 'laporan-hilang' && (
        <AdminReportsView
          lostReports={lostReports}
          isLoading={isReportsLoading}
          reportsError={reportsError}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={reportStatusFilter}
          onStatusFilterChange={setReportStatusFilter}
          onSelectReport={setViewingReport}
          onOpenMarkFound={setMarkingFoundReport}
          onOpenCompleteHandover={setCompletingReport}
          onCopyTicket={handleCopyTicket}
          copiedTicket={copiedTicket}
          getWhatsAppVerificationUrl={getWhatsAppVerificationUrl}
          isUpdatingReport={isUpdatingReport}
          onRetry={handleRefresh}
        />
      )}

      {/* MODALS */}
      <ClaimDetailModal
        key={viewingClaim?.id || 'claim-detail-modal'}
        claim={viewingClaim}
        onClose={() => setViewingClaim(null)}
        onApprove={(claimId, location) => handleSingleUpdate(claimId, 'disetujui', location)}
        onRejectModalOpen={setRejectingClaim}
        onReopenReview={(claimId) => {
          handleSingleUpdate(claimId, 'ditinjau');
          setViewingClaim((prev) => (prev ? { ...prev, status: 'ditinjau' } : null));
        }}
        isPending={updateClaimMutation.isPending}
        onMarkHandedOver={handleMarkHandedOver}
        isMarkingHandedOver={handoverMutation.isPending}
        quickLocations={QUICK_LOCATIONS}
      />

      <RejectClaimModal
        key={rejectingClaim?.id || 'reject-claim-modal'}
        claim={rejectingClaim}
        onClose={() => setRejectingClaim(null)}
        onConfirm={handleConfirmReject}
        isPending={updateClaimMutation.isPending}
      />

      <Modal
        open={isBulkApproveOpen}
        onOpenChange={setIsBulkApproveOpen}
        title="Setujui Klaim Terpilih"
        description={`Anda akan menyetujui ${selectedIds.length} klaim sekaligus.`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="bulk-pickup" className="text-xs font-bold text-slate-700 block mb-1">
              Lokasi Pengambilan Barang untuk Klaim Terpilih
            </label>
            <input
              id="bulk-pickup"
              type="text"
              value={bulkPickupLocation}
              onChange={(e) => setBulkPickupLocation(e.target.value)}
              placeholder="Contoh: Resepsionis / Lobi Utama VINIX7"
              className="form-input w-full text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setBulkPickupLocation(loc)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                    bulkPickupLocation === loc
                      ? 'bg-[#123356] text-white border-[#123356]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setIsBulkApproveOpen(false)}
              disabled={bulkUpdateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkApprove}
              loading={bulkUpdateMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              Setujui {selectedIds.length} Klaim
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={isBulkRejectOpen}
        onOpenChange={setIsBulkRejectOpen}
        title="Tolak Klaim Terpilih"
        message={`Apakah Anda yakin ingin menolak ${selectedIds.length} klaim sekaligus? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={`Tolak ${selectedIds.length} Klaim`}
        cancelText="Batal"
        variant="destructive"
        loading={bulkUpdateMutation.isPending}
        onConfirm={handleBulkReject}
      />

      <LostReportDetailModal
        report={viewingReport}
        onClose={() => setViewingReport(null)}
        onOpenMarkFound={setMarkingFoundReport}
        onOpenCompleteHandover={setCompletingReport}
        getWhatsAppVerificationUrl={getWhatsAppVerificationUrl}
      />

      <CustodyChainModal
        key={markingFoundReport?.id || 'custody-chain-modal'}
        report={markingFoundReport}
        onClose={() => setMarkingFoundReport(null)}
        onConfirm={handleConfirmMarkFound}
        isPending={isUpdatingReport}
        quickLocations={QUICK_LOCATIONS}
      />

      {completingReport && (
        <ConfirmModal
          open={Boolean(completingReport)}
          onOpenChange={(open) => !open && setCompletingReport(null)}
          title="Konfirmasi Penyerahan Barang"
          message={`Pastikan Anda telah melakukan verifikasi identitas (ID card/KTP) dan pengujian ciri rahasia kepada pemilik sebelum menyerahkan barang "${completingReport.item_title}". Laporan akan ditandai Selesai.`}
          confirmText="Selesaikan Serah Terima"
          cancelText="Batal"
          variant="primary"
          loading={isUpdatingReport}
          onConfirm={handleConfirmCompleteReport}
        />
      )}
    </div>
  );
}