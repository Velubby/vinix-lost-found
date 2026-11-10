'use client';

import Image from 'next/image';
import {
  Search,
  X,
  Eye,
  Check,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  Phone,
  Copy,
  CheckCheck,
  Building2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import type { Claim, FilterStatus, ClaimStats } from '@/types/claims';
import { STATUS_LABELS } from '@/types/claims';
import { formatDate } from '@/lib/date';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { StatusFilter, ActionMenu } from '@/components/ui/DropdownMenu';
import { ClaimCardSkeleton } from '@/components/ui/Skeleton';

interface AdminClaimsViewProps {
  claims: Claim[];
  isLoading: boolean;
  claimsError: Error | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (status: FilterStatus) => void;
  stats?: ClaimStats;
  selectedIds: string[];
  onToggleSelectClaim: (id: string) => void;
  onToggleSelectAll: () => void;
  allProcessableSelected: boolean;
  processableVisibleCount: number;
  onOpenDetail: (claim: Claim) => void;
  onOpenRejectModal: (claim: Claim) => void;
  onSingleUpdate: (claimId: string, status: 'ditinjau' | 'disetujui' | 'ditolak') => void;
  onMarkHandedOver: (claimId: string) => void;
  isMarkingHandedOver: boolean;
  onCopyTicket: (code: string) => void;
  copiedTicket: string | null;
  onBulkMarkReview: () => void;
  onBulkApproveOpen: () => void;
  onBulkRejectOpen: () => void;
  onClearSelection: () => void;
  isBulkUpdating: boolean;
  isUpdatingSingle: boolean;
  onRetry: () => void;
}

export function AdminClaimsView({
  claims,
  isLoading,
  claimsError,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  stats,
  selectedIds,
  onToggleSelectClaim,
  onToggleSelectAll,
  allProcessableSelected,
  processableVisibleCount,
  onOpenDetail,
  onOpenRejectModal,
  onSingleUpdate,
  onMarkHandedOver,
  isMarkingHandedOver,
  onCopyTicket,
  copiedTicket,
  onBulkMarkReview,
  onBulkApproveOpen,
  onBulkRejectOpen,
  onClearSelection,
  isBulkUpdating,
  isUpdatingSingle,
  onRetry,
}: AdminClaimsViewProps) {
  return (
    <div className="space-y-6">
      {/* Filter and Search Controls */}
      <section aria-label="Pencarian dan Filter" className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari tiket, nama pemohon, ID karyawan, departemen, atau barang..."
            className="form-input form-input-icon-left w-full text-xs sm:text-sm min-h-[44px]"
            aria-label="Cari klaim"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
              aria-label="Hapus kata kunci pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter for Mobile */}
        <div className="sm:hidden">
          <StatusFilter value={statusFilter} onChange={onStatusFilterChange} className="w-full justify-between" />
        </div>

        {/* Status Filter Buttons for Tablet & Desktop */}
        <div className="hidden sm:flex flex-wrap gap-1.5 bg-black/4 p-1 rounded-xl border border-black/5">
          {(['semua', 'diajukan', 'ditinjau', 'disetujui', 'ditolak'] as FilterStatus[]).map((status) => {
            const count =
              status === 'semua'
                ? stats?.total
                : status === 'diajukan'
                ? stats?.pending
                : status === 'ditinjau'
                ? stats?.underReview
                : status === 'disetujui'
                ? stats?.approved
                : stats?.rejected;

            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  statusFilter === status
                    ? 'bg-[#123356] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                <span>{STATUS_LABELS[status]}</span>
                {count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      statusFilter === status
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Floating / Sticky Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <aside
          aria-label="Aksi Massal"
          className="sticky top-20 z-30 bg-[#123356] text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-sm font-bold">
              {selectedIds.length} klaim dipilih
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onBulkMarkReview}
              loading={isBulkUpdating}
              className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 min-h-[40px]"
            >
              <Eye className="w-3.5 h-3.5" />
              Tandai Ditinjau
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onBulkApproveOpen}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent min-h-[40px]"
            >
              <Check className="w-3.5 h-3.5" />
              Setujui Terpilih
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBulkRejectOpen}
              className="text-xs min-h-[40px]"
            >
              <X className="w-3.5 h-3.5" />
              Tolak Terpilih
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-xs text-slate-300 hover:text-white hover:bg-white/10 min-h-[40px]"
            >
              Batal
            </Button>
          </div>
        </aside>
      )}

      {/* Error State */}
      {claimsError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-bold">Gagal memuat daftar klaim</p>
            <p className="mt-0.5">{claimsError.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry} className="text-xs min-h-[36px]">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Claims List Header with Select All */}
      {claims.length > 0 && processableVisibleCount > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={allProcessableSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Pilih semua klaim yang belum diproses"
            />
            <span className="font-medium text-slate-700">
              Pilih semua klaim aktif ({processableVisibleCount})
            </span>
          </label>
          <span>Menampilkan {claims.length} klaim</span>
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
      {!isLoading && claims.length === 0 && (
        <div className="apple-card bg-white p-12 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-[#123356]">
            {searchQuery
              ? `Tidak ada hasil pencarian untuk "${searchQuery}"`
              : statusFilter !== 'semua'
              ? `Tidak ada klaim berstatus ${STATUS_LABELS[statusFilter]}`
              : 'Belum ada pengajuan klaim'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Periksa kembali ejaan tiket, nama pemohon, atau gunakan kata kunci lain.'
              : 'Klaim baru dari pemilik barang akan otomatis tercatat di halaman ini.'}
          </p>
          {(searchQuery || statusFilter !== 'semua') && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSearchChange('');
                  onStatusFilterChange('semua');
                }}
                className="text-xs"
              >
                Tampilkan Semua Klaim
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Claims Cards */}
      {!isLoading && claims.length > 0 && (
        <div className="grid gap-4">
          {claims.map((claim) => {
            const isProcessable = claim.status === 'diajukan' || claim.status === 'ditinjau';
            const isSelected = selectedIds.includes(claim.id);

            return (
              <article
                key={claim.id}
                className={`apple-card bg-white p-5 sm:p-6 transition-all ${
                  isSelected ? 'border-sky-500 bg-sky-50/20 shadow-md' : ''
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: Checkbox + Thumbnail + Details */}
                  <div className="flex min-w-0 items-start gap-4">
                    {/* Checkbox (only if claim can be processed) */}
                    <div className="pt-1">
                      {isProcessable ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelectClaim(claim.id)}
                          aria-label={`Pilih klaim tiket ${claim.ticket_code}`}
                        />
                      ) : (
                        <div className="w-5 h-5 flex items-center justify-center text-slate-300">
                          {claim.status === 'disetujui' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Item Image */}
                    {claim.item?.image_url ? (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                        <Image
                          src={claim.item.image_url}
                          alt={claim.item.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
                        <Eye className="h-6 w-6" />
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-base text-[#123356] leading-snug">
                          {claim.item?.title || 'Barang temuan'}
                        </h2>
                        <Badge variant="status" status={claim.status} dot>
                          {claim.status === 'disetujui' && claim.pickup_at ? 'Sudah diambil' : STATUS_LABELS[claim.status]}
                        </Badge>
                      </div>

                      {/* Ticket Code Tag */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onCopyTicket(claim.ticket_code)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold transition-colors"
                          title="Klik untuk menyalin kode tiket"
                        >
                          <span>Tiket {claim.ticket_code}</span>
                          {copiedTicket === claim.ticket_code ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{formatDate(claim.created_at)}</span>
                      </div>

                      {/* Claimant Identity */}
                      <div className="text-xs text-slate-700 pt-0.5">
                        <p>
                          Pemohon:{' '}
                          <strong className="text-slate-900">
                            {claim.claimant?.full_name || 'Nama belum diisi'}
                          </strong>
                          {claim.claimant?.employee_id && (
                            <span className="text-slate-500"> (ID {claim.claimant.employee_id})</span>
                          )}
                        </p>
                        {claim.claimant?.department && (
                          <p className="text-slate-500">{claim.claimant.department}</p>
                        )}
                      </div>

                      {/* Location & Contact Phone */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          Lokasi temuan: {claim.item?.location || 'Tidak tercatat'}
                        </span>
                        {claim.contact_phone && (
                          <a
                            href={`https://wa.me/${claim.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {claim.contact_phone}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Pickup & handover info */}
                      {claim.status === 'disetujui' && claim.pickup_location && (
                        <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-900 space-y-1">
                          <p>
                            <strong>Lokasi pengambilan:</strong> {claim.pickup_location}
                          </p>
                          {claim.pickup_at ? (
                            <p className="text-emerald-700">
                              Diserahkan pada: {formatDate(claim.pickup_at)}
                            </p>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                                <Clock3 className="w-3.5 h-3.5" />
                                Menunggu pengambilan
                              </span>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => onMarkHandedOver(claim.id)}
                                loading={isMarkingHandedOver}
                                className="bg-emerald-700 hover:bg-emerald-800 text-xs min-h-[36px]"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Tandai sudah diambil
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons on Desktop, ActionMenu on Mobile */}
                  <div className="hidden sm:flex shrink-0 flex-wrap items-center gap-2 pt-2 lg:pt-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenDetail(claim)}
                      className="text-xs min-h-[44px]"
                    >
                      <Eye className="w-4 h-4 text-sky-800" />
                      Lihat Verifikasi
                    </Button>

                    {claim.status === 'diajukan' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSingleUpdate(claim.id, 'ditinjau')}
                        loading={isUpdatingSingle}
                        className="text-xs min-h-[44px]"
                      >
                        Mulai Tinjau
                      </Button>
                    )}

                    {isProcessable && (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => onOpenDetail(claim)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-xs min-h-[44px]"
                        >
                          <Check className="w-4 h-4" />
                          Setujui
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenRejectModal(claim)}
                          loading={isUpdatingSingle}
                          className="text-rose-700 border-rose-200 hover:bg-rose-50 text-xs min-h-[44px]"
                        >
                          <X className="w-4 h-4" />
                          Tolak
                        </Button>
                      </>
                    )}

                    {claim.status === 'ditolak' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSingleUpdate(claim.id, 'ditinjau')}
                        loading={isUpdatingSingle}
                        className="text-sky-700 border-sky-300 hover:bg-sky-50 text-xs min-h-[44px]"
                        title="Buka kembali klaim untuk peninjauan ulang jika terjadi salah klik atau pemohon melengkapi bukti"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Tinjau Kembali
                      </Button>
                    )}
                  </div>

                  <div className="sm:hidden pt-2 flex items-center justify-end">
                    <ActionMenu
                      claimId={claim.id}
                      currentStatus={claim.status}
                      onView={() => onOpenDetail(claim)}
                      onUpdate={(id, status) => {
                        if (status === 'disetujui') {
                          onOpenDetail(claim);
                        } else {
                          onSingleUpdate(id, status);
                        }
                      }}
                      disabled={isUpdatingSingle}
                    />
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
