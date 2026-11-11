'use client';

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
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminItemImage } from './AdminItemImage';

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

const FILTER_OPTIONS: FilterStatus[] = ['semua', 'diajukan', 'ditinjau', 'disetujui', 'ditolak'];

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
  const filterCount = (status: FilterStatus) =>
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
    <div className="space-y-5">
      {/* Filter and Search Controls */}
      <section
        aria-label="Pencarian dan Filter"
        className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
      >
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari tiket, nama pemohon, ID karyawan, departemen, atau barang..."
            className="form-input form-input-icon-left w-full"
            aria-label="Cari klaim"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-control text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Hapus kata kunci pencarian"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Status Filter for Mobile */}
        <div className="sm:hidden">
          <StatusFilter value={statusFilter} onChange={onStatusFilterChange} className="w-full justify-between" />
        </div>

        {/* Status Filter Buttons for Tablet & Desktop */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {FILTER_OPTIONS.map((status) => {
            const isActive = statusFilter === status;
            const count = filterCount(status);

            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusFilterChange(status)}
                aria-pressed={isActive}
                className={[
                  'inline-flex min-h-9 items-center rounded-pill border px-3 text-xs font-semibold transition-colors',
                  isActive
                    ? 'border-brand bg-brand text-inverse'
                    : 'border-line bg-surface text-body hover:border-line-strong hover:bg-surface-muted',
                ].join(' ')}
              >
                <span>{STATUS_LABELS[status]}</span>
                {count !== undefined && (
                  <span className="ml-1.5 tabular-nums opacity-75">({count})</span>
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
          className="sticky top-20 z-30 flex flex-col items-start justify-between gap-3 rounded-card bg-brand p-4 text-inverse shadow-card sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-highlight" aria-hidden="true" />
            <span className="text-sm font-semibold">{selectedIds.length} klaim dipilih</span>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={onBulkMarkReview}
              loading={isBulkUpdating}
              className="border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/20"
            >
              <Eye className="size-3.5" aria-hidden="true" />
              Tandai Ditinjau
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onBulkApproveOpen}
              className="bg-white text-brand hover:bg-white/90"
            >
              <Check className="size-3.5" aria-hidden="true" />
              Setujui Terpilih
            </Button>
            <Button variant="destructive" size="sm" onClick={onBulkRejectOpen}>
              <X className="size-3.5" aria-hidden="true" />
              Tolak Terpilih
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              Batal
            </Button>
          </div>
        </aside>
      )}

      {/* Error State */}
      {claimsError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-card border border-danger/20 bg-danger-soft p-4 text-[13px] text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">Gagal memuat daftar klaim</p>
            <p className="leading-5">{claimsError.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Claims List Header with Select All */}
      {claims.length > 0 && processableVisibleCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <Checkbox
              checked={allProcessableSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Pilih semua klaim yang belum diproses"
            />
            <span className="font-medium text-body">
              Pilih semua klaim aktif ({processableVisibleCount})
            </span>
          </label>
          <span>Menampilkan {claims.length} klaim</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid gap-3">
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
          <ClaimCardSkeleton />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && claims.length === 0 && (
        <EmptyState
          icon={<Clock3 className="size-6" aria-hidden="true" />}
          title={
            searchQuery
              ? `Tidak ada hasil pencarian untuk "${searchQuery}"`
              : statusFilter !== 'semua'
              ? `Tidak ada klaim berstatus ${STATUS_LABELS[statusFilter]}`
              : 'Belum ada pengajuan klaim'
          }
          description={
            searchQuery
              ? 'Periksa kembali ejaan tiket, nama pemohon, atau gunakan kata kunci lain.'
              : 'Klaim baru dari pemilik barang akan otomatis tercatat di halaman ini.'
          }
          action={
            (searchQuery || statusFilter !== 'semua') ? (
              <Button
                variant="outline"
                onClick={() => {
                  onSearchChange('');
                  onStatusFilterChange('semua');
                }}
              >
                Tampilkan Semua Klaim
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Claims Cards */}
      {!isLoading && claims.length > 0 && (
        <div className="grid gap-3">
          {claims.map((claim) => {
            const isProcessable = claim.status === 'diajukan' || claim.status === 'ditinjau';
            const isSelected = selectedIds.includes(claim.id);

            return (
              <article
                key={claim.id}
                className={[
                  'rounded-card border bg-surface p-4 transition-colors sm:p-5',
                  isSelected ? 'border-accent ring-1 ring-accent/20' : 'border-line',
                ].join(' ')}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Left: Checkbox + Thumbnail + Details */}
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    {/* Checkbox (only if claim can be processed) */}
                    <div className="pt-1">
                      {isProcessable ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleSelectClaim(claim.id)}
                          aria-label={`Pilih klaim tiket ${claim.ticket_code}`}
                        />
                      ) : (
                        <span className="flex size-5 items-center justify-center">
                          {claim.status === 'disetujui' ? (
                            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                          ) : (
                            <XCircle className="size-4 text-danger" aria-hidden="true" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Item Image */}
                    {claim.item?.image_url ? (
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-surface border border-line bg-surface-muted">
                        <AdminItemImage
                          src={claim.item.image_url}
                          alt={claim.item.title}
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-20 shrink-0 items-center justify-center rounded-surface border border-line bg-surface-muted text-muted">
                        <Eye className="size-6" aria-hidden="true" />
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-balance text-[15px] font-semibold leading-snug text-ink sm:text-base">
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
                          className="inline-flex min-h-7 items-center gap-1.5 rounded-control border border-line bg-surface-muted px-2 py-0.5 font-mono text-xs font-semibold text-body transition-colors hover:bg-surface hover:text-ink"
                          title="Klik untuk menyalin kode tiket"
                        >
                          <span className="tabular-nums">Tiket {claim.ticket_code}</span>
                          {copiedTicket === claim.ticket_code ? (
                            <CheckCheck className="size-3 text-success" aria-hidden="true" />
                          ) : (
                            <Copy className="size-3 text-muted" aria-hidden="true" />
                          )}
                        </button>
                        <span className="text-muted" aria-hidden="true">·</span>
                        <span className="text-muted">{formatDate(claim.created_at)}</span>
                      </div>

                      {/* Claimant Identity */}
                      <div className="space-y-0.5 pt-0.5 text-[13px] leading-5 text-body">
                        <p>
                          Pemohon:{' '}
                          <strong className="font-semibold text-ink">
                            {claim.claimant?.full_name || 'Nama belum diisi'}
                          </strong>
                          {claim.claimant?.employee_id && (
                            <span className="text-muted"> (ID {claim.claimant.employee_id})</span>
                          )}
                        </p>
                        {claim.claimant?.department && (
                          <p className="text-muted">{claim.claimant.department}</p>
                        )}
                      </div>

                      {/* Location & Contact Phone */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3.5" aria-hidden="true" />
                          Lokasi temuan: {claim.item?.location || 'Tidak tercatat'}
                        </span>
                        {claim.contact_phone && (
                          <a
                            href={`https://wa.me/${claim.contact_phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-brand"
                          >
                            <Phone className="size-3.5" aria-hidden="true" />
                            {claim.contact_phone}
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </a>
                        )}
                      </div>

                      {/* Pickup & handover info */}
                      {claim.status === 'disetujui' && claim.pickup_location && (
                        <div className="mt-2 space-y-1.5 rounded-surface border border-success/20 bg-success-soft p-3 text-[13px] leading-5 text-body">
                          <p>
                            <strong className="font-semibold text-ink">Lokasi pengambilan:</strong>{' '}
                            {claim.pickup_location}
                          </p>
                          {claim.pickup_at ? (
                            <p className="text-success">
                              Diserahkan pada: {formatDate(claim.pickup_at)}
                            </p>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              <span className="inline-flex items-center gap-1 rounded-pill border border-warning/20 bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                                <Clock3 className="size-3.5" aria-hidden="true" />
                                Menunggu pengambilan
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => onMarkHandedOver(claim.id)}
                                loading={isMarkingHandedOver}
                              >
                                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                Tandai sudah diambil
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons on Desktop, ActionMenu on Mobile */}
                  <div className="hidden shrink-0 gap-2 pt-2 sm:flex sm:flex-wrap sm:items-center lg:w-56 lg:flex-col lg:items-stretch lg:pt-0">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => onOpenDetail(claim)}
                      className="w-full"
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Lihat Verifikasi
                    </Button>

                    {claim.status === 'diajukan' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSingleUpdate(claim.id, 'ditinjau')}
                        loading={isUpdatingSingle}
                        className="w-full"
                      >
                        Mulai Tinjau
                      </Button>
                    )}

                    {isProcessable && (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => onOpenDetail(claim)}
                          className="w-full"
                        >
                          <Check className="size-4" aria-hidden="true" />
                          Setujui
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => onOpenRejectModal(claim)}
                          loading={isUpdatingSingle}
                          className="w-full border-danger/30 text-danger hover:bg-danger-soft"
                        >
                          <X className="size-4" aria-hidden="true" />
                          Tolak
                        </Button>
                      </>
                    )}

                    {claim.status === 'ditolak' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSingleUpdate(claim.id, 'ditinjau')}
                        loading={isUpdatingSingle}
                        className="w-full border-accent/30 text-accent hover:bg-accent/5"
                        title="Buka kembali klaim untuk peninjauan ulang jika terjadi salah klik atau pemohon melengkapi bukti"
                      >
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        Tinjau Kembali
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-1 sm:hidden">
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
