import type { FilterStatus, ClaimStats } from '@/types/claims';
import { StatsCardSkeleton } from '@/components/ui/Skeleton';

interface AdminStatsOverviewProps {
  stats: ClaimStats | undefined;
  statusFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
  isLoading: boolean;
}

const STAT_CARDS: Array<{
  id: FilterStatus;
  label: string;
  dot?: string;
  value: (stats: ClaimStats | undefined) => number;
}> = [
  { id: 'semua', label: 'Total Klaim', value: (stats) => stats?.total ?? 0 },
  { id: 'diajukan', label: 'Menunggu', dot: 'bg-warning', value: (stats) => stats?.pending ?? 0 },
  { id: 'ditinjau', label: 'Ditinjau', dot: 'bg-info', value: (stats) => stats?.underReview ?? 0 },
  { id: 'disetujui', label: 'Disetujui', dot: 'bg-success', value: (stats) => stats?.approved ?? 0 },
  { id: 'ditolak', label: 'Ditolak', dot: 'bg-danger', value: (stats) => stats?.rejected ?? 0 },
];

export function AdminStatsOverview({
  stats,
  statusFilter,
  onSelectFilter,
  isLoading,
}: AdminStatsOverviewProps) {
  if (isLoading) {
    return (
      <section aria-label="Statistik Klaim" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </section>
    );
  }

  return (
    <section aria-label="Statistik Klaim" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {STAT_CARDS.map((card) => {
        const isActive = statusFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            aria-pressed={isActive}
            className={[
              'rounded-card border p-4 text-left transition-colors sm:p-5',
              card.id === 'ditolak' ? 'max-lg:col-span-2' : '',
              isActive
                ? 'border-brand bg-surface ring-1 ring-brand'
                : 'border-line bg-surface hover:border-line-strong',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
              {card.dot && <span className={`size-1.5 rounded-full ${card.dot}`} aria-hidden="true" />}
              {card.label}
            </span>
            <span className="mt-1.5 block text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
              {card.value(stats)}
            </span>
          </button>
        );
      })}
    </section>
  );
}
