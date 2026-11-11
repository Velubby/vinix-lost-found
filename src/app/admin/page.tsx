'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Clock, PackageCheck, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';
import { checkIsStaff } from '@/lib/supabase/auth';
import type { Claim, FilterStatus, LostReport, FilterReportStatus } from '@/types/claims';
import { fetchLostReportsAction, updateReportStatusAction, getAdminTabCountsAction } from '@/app/admin/actions';
import { useClaims, useClaimStats, useUpdateClaim, useBulkUpdateClaims, useMarkClaimHandedOver } from '@/hooks/useClaims';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

import { AdminStatsOverview } from './components/AdminStatsOverview';
import { AdminClaimsView } from './components/AdminClaimsView';
import { AdminItemImage } from './components/AdminItemImage';
import { AdminReportsView } from './components/AdminReportsView';
import { ClaimDetailModal } from './components/ClaimDetailModal';
import { RejectClaimModal } from './components/RejectClaimModal';
import { CustodyChainModal } from './components/CustodyChainModal';
import { LostReportDetailModal } from './components/LostReportDetailModal';
import { DEFAULT_PICKUP_LOCATION, PICKUP_LOCATIONS } from '@/lib/locations';

const QUICK_LOCATIONS = PICKUP_LOCATIONS;

const ADMIN_TABS = [
  { id: 'klaim', label: 'Klaim Barang Temuan' },
  { id: 'laporan-hilang', label: 'Laporan Barang Hilang' },
  { id: 'konfirmasi', label: 'Konfirmasi Barang' },
] as const;

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

  // Keep the active tab visible when the rail scrolls horizontally on phones
  const tabRailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const activeTabButton = tabRailRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    activeTabButton?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeTab]);

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
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-muted sm:px-6 lg:px-8">
        Memeriksa hak akses admin...
      </div>
    );
  }

  if (isStaff === false) {
    return null;
  }

  const tabCount: Record<(typeof ADMIN_TABS)[number]['id'], number> = {
    klaim: tabCounts?.claims ?? stats?.pending ?? 0,
    'laporan-hilang': tabCounts?.lostReports ?? 0,
    konfirmasi: tabCounts?.confirmations ?? 0,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Ruang Kerja Admin"
        title={
          activeTab === 'klaim'
            ? 'Verifikasi Klaim Barang'
            : activeTab === 'konfirmasi'
            ? 'Konfirmasi Barang'
            : 'Daftar Laporan Barang Hilang'
        }
        description={
          activeTab === 'klaim'
            ? 'Cocokkan ciri rahasia dari pemohon sebelum menyetujui serah terima barang temuan.'
            : activeTab === 'konfirmasi'
            ? 'Daftar barang temuan yang dilaporkan karyawan dan menunggu verifikasi fisik di pos/penyimpanan.'
            : 'Pantau dan kelola laporan kehilangan yang diajukan karyawan.'
        }
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            loading={isClaimsFetching || isReportsFetching}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            <span>Muat Ulang</span>
          </Button>
        }
      />

      {/* Primary Tab Switcher */}
      <nav aria-label="Bagian ruang kerja admin" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div ref={tabRailRef} className="flex min-w-max items-center gap-1 border-b border-line">
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={[
                  '-mb-px inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-[13px] transition-colors sm:px-4 sm:text-sm',
                  isActive
                    ? 'border-brand font-semibold text-ink'
                    : 'border-transparent font-medium text-muted hover:text-ink',
                ].join(' ')}
              >
                <span>{tab.label}</span>
                <span
                  className={[
                    'min-w-5 rounded-pill px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    isActive
                      ? 'bg-brand text-inverse'
                      : 'border border-line bg-surface-muted text-body',
                  ].join(' ')}
                >
                  {tabCount[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab === 'konfirmasi' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetchLostReports()}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`size-4 ${isReportsFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Segarkan</span>
            </Button>
          </div>

          {isReportsLoading ? (
            <div className="rounded-card border border-line bg-surface px-6 py-12 text-center">
              <RefreshCw className="mx-auto mb-3 size-6 animate-spin text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-body">Sedang memuat data barang temuan...</p>
            </div>
          ) : pendingHandoverReports.length === 0 ? (
            <EmptyState
              icon={<PackageCheck className="size-6" aria-hidden="true" />}
              title="Tidak ada barang yang menunggu penyerahan"
              description="Semua barang temuan yang dilaporkan telah dikonfirmasi dan diamankan di pos/penyimpanan."
            />
          ) : (
            <div className="grid gap-3">
              {pendingHandoverReports.map((report) => (
                <article key={report.id} className="rounded-card border border-line bg-surface p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* Image & Main Info */}
                    <div className="flex flex-1 items-start gap-4">
                      {report.image_url || (report.image_urls?.length ?? 0) > 0 ? (
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-surface border border-line bg-surface-muted sm:size-24">
                          <AdminItemImage
                            src={report.image_url || report.image_urls?.[0] || ''}
                            alt={report.item_title}
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex size-20 shrink-0 items-center justify-center rounded-surface border border-line bg-surface-muted text-muted sm:size-24">
                          <Clock className="size-6" aria-hidden="true" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-control border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-body">
                            {report.category}
                          </span>
                          <span className="font-mono text-xs text-muted">{report.report_code}</span>
                        </div>
                        <h3 className="truncate text-balance text-[15px] font-semibold text-ink sm:text-base">
                          {report.item_title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            {report.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5" aria-hidden="true" />
                            {new Date(report.incident_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {report.public_description && (
                          <p className="line-clamp-2 text-pretty text-[13px] leading-5 text-body">
                            {report.public_description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full shrink-0 flex-col gap-2.5 border-t border-line pt-4 sm:flex-row sm:items-center lg:w-auto lg:border-t-0 lg:pt-0">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-warning/20 bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning">
                        <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
                        Menunggu Penyerahan
                      </span>
                      <Button
                        type="button"
                        onClick={() => handleConfirmItemHandover(report)}
                        loading={confirmingReportId === report.id}
                        className="w-full sm:w-auto"
                      >
                        {confirmingReportId === report.id ? 'Memproses...' : 'Tandai Diterima di Pos'}
                      </Button>
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
        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="bulk-pickup" className="block text-[13px] font-semibold text-ink">
              Lokasi Pengambilan Barang untuk Klaim Terpilih
            </label>
            <input
              id="bulk-pickup"
              type="text"
              value={bulkPickupLocation}
              onChange={(e) => setBulkPickupLocation(e.target.value)}
              placeholder="Contoh: Resepsionis / Lobi Utama VINIX7"
              className="form-input w-full"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setBulkPickupLocation(loc)}
                  aria-pressed={bulkPickupLocation === loc}
                  className={[
                    'min-h-9 rounded-control border px-2.5 text-[11px] font-medium transition-colors',
                    bulkPickupLocation === loc
                      ? 'border-brand bg-brand text-inverse'
                      : 'border-line bg-surface text-body hover:border-line-strong hover:bg-surface-muted',
                  ].join(' ')}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsBulkApproveOpen(false)}
              disabled={bulkUpdateMutation.isPending}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkApprove}
              loading={bulkUpdateMutation.isPending}
              className="w-full sm:w-auto"
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
