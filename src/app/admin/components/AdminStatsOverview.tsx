import type { FilterStatus, ClaimStats } from '@/types/claims';
import { StatsCardSkeleton } from '@/components/ui/Skeleton';

interface AdminStatsOverviewProps {
  stats: ClaimStats | undefined;
  statusFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
  isLoading: boolean;
}

export function AdminStatsOverview({
  stats,
  statusFilter,
  onSelectFilter,
  isLoading,
}: AdminStatsOverviewProps) {
  if (isLoading) {
    return (
      <section aria-label="Statistik Klaim" className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </section>
    );
  }

  return (
    <section aria-label="Statistik Klaim" className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <button
        type="button"
        onClick={() => onSelectFilter('semua')}
        className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer ${
          statusFilter === 'semua' ? 'ring-2 ring-[#123356] border-[#123356]' : 'hover:border-slate-300'
        }`}
      >
        <span className="text-xs font-semibold text-slate-500 block">Total Klaim</span>
        <span className="text-2xl sm:text-3xl font-black text-[#123356] mt-1 block">
          {stats?.total ?? 0}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('diajukan')}
        className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer ${
          statusFilter === 'diajukan' ? 'ring-2 ring-amber-500 border-amber-500' : 'hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-semibold text-slate-500 block">Menunggu</span>
        </div>
        <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 block">
          {stats?.pending ?? 0}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('ditinjau')}
        className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer ${
          statusFilter === 'ditinjau' ? 'ring-2 ring-sky-500 border-sky-500' : 'hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-xs font-semibold text-slate-500 block">Ditinjau</span>
        </div>
        <span className="text-2xl sm:text-3xl font-black text-sky-600 mt-1 block">
          {stats?.underReview ?? 0}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('disetujui')}
        className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer ${
          statusFilter === 'disetujui' ? 'ring-2 ring-emerald-500 border-emerald-500' : 'hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-500 block">Disetujui</span>
        </div>
        <span className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 block">
          {stats?.approved ?? 0}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectFilter('ditolak')}
        className={`apple-card p-4 sm:p-5 text-left transition-all cursor-pointer ${
          statusFilter === 'ditolak' ? 'ring-2 ring-rose-500 border-rose-500' : 'hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-xs font-semibold text-slate-500 block">Ditolak</span>
        </div>
        <span className="text-2xl sm:text-3xl font-black text-rose-600 mt-1 block">
          {stats?.rejected ?? 0}
        </span>
      </button>
    </section>
  );
}
