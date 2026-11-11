'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, RotateCcw, AlertCircle, ChevronDown } from 'lucide-react';
import { fetchCatalogItems, type CatalogItem } from '@/lib/supabase/items';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ItemCard } from '@/components/ItemCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [timeRange, setTimeRange] = useState('all');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Captured once at mount — stable, no re-renders
  const [now] = useState(Date.now);

  useEffect(() => {
    fetchCatalogItems()
      .then(setItems)
      .catch(() => setCatalogError('Katalog belum dapat dimuat. Coba lagi nanti.'))
      .finally(() => setIsLoading(false));
  }, []);

  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const locations = Array.from(new Set(items.map((item) => item.location))).sort();

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedLocation('');
    setSelectedCategories([]);
    setSelectedLocations([]);
    setTimeRange('all');
  };

  const filteredItems = useMemo(() => {
    const minimumDate =
      timeRange === 'all' || !now
        ? null
        : new Date(now - Number(timeRange) * 24 * 60 * 60 * 1000);

    return items.filter(item => {
      // Exclude items that are claimed, approved, or completed
      const itemStatus = (item as CatalogItem & { status?: string }).status;
      if (itemStatus && ['diklaim', 'disetujui', 'selesai', 'menunggu penyerahan'].includes(itemStatus.toLowerCase())) {
        return false;
      }

      // Query filter
      const q = query.toLowerCase().trim();
      const matchQuery = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryTag.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);

      // Select location
      const matchSelectLoc = !selectedLocation || item.location.toLowerCase().includes(selectedLocation.toLowerCase());

      // Category filter
      const matchCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);

      // Checkbox locations
      const matchLocation = selectedLocations.length === 0 || selectedLocations.some(l => item.location.toLowerCase().includes(l.toLowerCase()));
      const matchTime = !minimumDate || new Date(item.foundAt) >= minimumDate;

      return matchQuery && matchSelectLoc && matchCategory && matchLocation && matchTime;
    }).sort((first, second) => sortBy === 'oldest'
      ? new Date(first.foundAt).getTime() - new Date(second.foundAt).getTime()
      : new Date(second.foundAt).getTime() - new Date(first.foundAt).getTime());
  }, [items, query, selectedLocation, selectedCategories, selectedLocations, sortBy, timeRange, now]);

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedLocations.length > 0 || query || selectedLocation || timeRange !== 'all';

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        title="Barang yang mungkin cocok"
        description={`Menampilkan ${filteredItems.length} barang temuan terdaftar`}
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="sort-results" className="text-xs text-muted">
              Urutkan:
            </label>
            <select
              id="sort-results"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input min-h-11 py-2 pr-8 pl-3 text-sm"
            >
              <option value="newest">Terbaru ditemukan</option>
              <option value="oldest">Terlama ditemukan</option>
            </select>
          </div>
        }
      />

      {/* Search & quick filters */}
      <div className="rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
          <div className="relative sm:col-span-6">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Cari dompet, kunci, tas, atau warna..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari dompet, kunci, tas, atau warna..."
              className="form-input w-full pl-10 pr-4 text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              aria-label="Semua Lokasi"
              className="form-input w-full text-sm"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              aria-label="Semua waktu"
              className="form-input w-full text-sm"
            >
              <option value="all">Semua waktu</option>
              <option value="1">24 jam terakhir</option>
              <option value="7">7 hari terakhir</option>
              <option value="30">30 hari terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar Filter + Cards Grid */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Sidebar Filter */}
        <aside className="rounded-card border border-line bg-surface p-5 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Filter className="size-4 text-muted" aria-hidden="true" />
              <span>Filter Pencarian</span>
            </h2>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-danger transition-colors hover:text-danger/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="inline-flex min-h-11 items-center gap-1 rounded-control border border-line px-3 text-xs font-semibold text-body transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
                aria-expanded={filtersOpen}
                aria-controls="filter-panel"
              >
                {filtersOpen ? 'Tutup' : 'Buka'}
                <ChevronDown
                  className={`size-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          <div id="filter-panel" className={`${filtersOpen ? 'block space-y-6' : 'hidden'} pt-5 lg:block lg:space-y-6`}>
            {/* Category Filter */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Kategori
              </h3>
              <div>
                {categories.map(cat => (
                  <label key={cat} className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-[13px] text-body">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="size-4 rounded border-line-strong accent-accent focus:ring-2 focus:ring-accent/30"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-2 border-t border-line pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Lokasi Ditemukan
              </h3>
              <div>
                {locations.map(loc => (
                  <label key={loc} className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-[13px] text-body">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(loc)}
                      onChange={() => toggleLocation(loc)}
                      className="size-4 rounded border-line-strong accent-accent focus:ring-2 focus:ring-accent/30"
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Search Results */}
        <section className="space-y-6 lg:col-span-9">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Memuat katalog">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-card border border-line bg-surface">
                  <Skeleton variant="rectangular" className="aspect-4/3 w-full rounded-none" />
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-11 w-full rounded-control" />
                  </div>
                </div>
              ))}
            </div>
          ) : catalogError ? (
            <div role="alert" className="rounded-card border border-danger/20 bg-danger-soft px-6 py-10 text-center text-sm text-danger">
              {catalogError}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item, index) => (
                <ItemCard key={item.id} item={item} showDate priority={index === 0} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertCircle className="size-6" aria-hidden="true" />}
              title="Barang tidak ditemukan"
              description="Tidak ada barang yang cocok dengan kata kunci atau filter yang Anda pilih. Coba gunakan istilah umum atau reset filter."
              action={
                <button type="button" onClick={resetFilters} className="btn-secondary">
                  Reset Filter
                </button>
              }
              secondary={
                <Link href="/lapor?type=hilang" className="btn-primary">
                  Buat Laporan Barang Hilang
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-muted">
          Memuat katalog pencarian...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
