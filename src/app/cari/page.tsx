'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Clock, Filter, RotateCcw, AlertCircle, ChevronDown, ArrowRight } from 'lucide-react';
import { fetchCatalogItems, type CatalogItem } from '@/lib/supabase/items';

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

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const resultsElement = document.getElementById('daftar-hasil');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Search Bar */}
      <form onSubmit={handleSearchSubmit} className="apple-card p-4 sm:p-5 bg-white border border-slate-200/90 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari dompet, kunci, tas, atau warna..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white placeholder-slate-500 text-slate-900"
            />
          </div>

          {/* Location Quick Select */}
          <div className="sm:col-span-3">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="form-input w-full text-sm"
            >
              <option value="">Semua Lokasi</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Time range */}
          <div className="sm:col-span-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="form-input w-full text-sm"
            >
              <option value="all">Semua waktu</option>
              <option value="1">24 jam terakhir</option>
              <option value="7">7 hari terakhir</option>
              <option value="30">30 hari terakhir</option>
            </select>
          </div>

          {/* Search CTA */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-[#123356] hover:bg-[#0c233c] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
            >
              <Search className="w-4 h-4" />
              <span>Cari Barang</span>
            </button>
          </div>

        </div>
      </form>

      {/* Main Content: Sidebar Filter + Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Sidebar Filter */}
        <aside className="lg:col-span-3 apple-card p-5 space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="font-bold text-sm text-[#123356] flex items-center gap-2">
              <Filter className="w-4 h-4 text-sky-600" />
              <span>Filter Pencarian</span>
            </h2>
            <div className="flex items-center gap-3">
              {(selectedCategories.length > 0 || selectedLocations.length > 0 || query || selectedLocation || timeRange !== 'all') && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                className="lg:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700"
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? 'Tutup' : 'Buka'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          <div className={`${filtersOpen ? 'block space-y-6' : 'hidden'} lg:block lg:space-y-6`}>
          {/* Category Filter */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kategori
            </h3>
            <div className="space-y-1">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2.5 min-h-11 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location Filter */}
          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Lokasi Ditemukan
            </h3>
            <div className="space-y-1">
              {locations.map(loc => (
                <label key={loc} className="flex items-center gap-2.5 min-h-11 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(loc)}
                    onChange={() => toggleLocation(loc)}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500"
                  />
                  <span>{loc}</span>
                </label>
              ))}
            </div>
          </div>
          </div>

        </aside>

        {/* Right Column: Search Results */}
        <section className="lg:col-span-9 space-y-6">
          
          {/* Results Summary Bar */}
          <div id="daftar-hasil" className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2 scroll-mt-24">
            <div>
              <h2 className="text-xl font-extrabold text-[#123356]">
                Barang yang mungkin cocok
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan {filteredItems.length} barang temuan terdaftar
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-input text-xs py-1.5 px-3"
              >
                <option value="newest">Terbaru ditemukan</option>
                <option value="oldest">Terlama ditemukan</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoading ? (
            <div className="apple-card p-12 text-center text-sm text-slate-500">Memuat katalog...</div>
          ) : catalogError ? (
            <div role="alert" className="apple-card p-12 text-center text-sm text-rose-700">{catalogError}</div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => (
                <article
                  key={item.id}
                  className="apple-card group flex flex-col overflow-hidden bg-white border border-slate-200/90 hover:border-sky-300 transition-all duration-200"
                >
                  <Link href={`/barang/${item.id}`} className="relative h-44 w-full bg-slate-100 overflow-hidden block">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-100 flex items-center justify-center text-xs text-slate-500" aria-label="Foto belum tersedia">
                        Foto belum tersedia
                      </div>
                    )}
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 text-slate-700 shadow-xs border border-slate-200/70">
                      {item.categoryTag}
                    </span>
                  </Link>

                  <div className="p-4 flex flex-col flex-1">
                    <Link href={`/barang/${item.id}`} className="group/title block">
                      <h3 className="font-bold text-base text-[#123356] group-hover/title:text-sky-700 transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                    </Link>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.date} · {item.time}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed flex-1">
                      {item.description}
                    </p>

                    <div className="pt-3.5 mt-auto border-t border-slate-100">
                      <Link
                        href={`/barang/${item.id}`}
                        className="text-xs font-semibold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>Periksa &amp; Ajukan Klaim</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* Empty State matching Figma Smart Search empty state */
            <div className="apple-card p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-[#123356]">Barang tidak ditemukan</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Tidak ada barang yang cocok dengan kata kunci atau filter yang Anda pilih. Coba gunakan istilah umum atau reset filter.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={resetFilters}
                  className="btn-secondary text-xs"
                >
                  Reset Filter
                </button>
                <Link
                  href="/lapor?type=hilang"
                  className="btn-primary text-xs"
                >
                  Buat Laporan Barang Hilang
                </Link>
              </div>
            </div>
          )}

        </section>

      </div>

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500">Memuat katalog pencarian...</div>}>
      <SearchContent />
    </Suspense>
  );
}