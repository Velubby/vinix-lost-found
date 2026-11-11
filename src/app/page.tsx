'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, PlusCircle, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { fetchCatalogItems, type CatalogItem } from '@/lib/supabase/items';
import { ItemCard } from '@/components/ItemCard';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<CatalogItem[]>([]);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    fetchCatalogItems({ withinHours: 24 })
      .then((items) => setRecentItems(items.slice(0, 4)))
      .catch(() => setCatalogError('Katalog belum dapat dimuat. Coba lagi nanti.'));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/cari');
    }
  };

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Copy & Search */}
          <div className="space-y-7 lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Layanan Internal Kantor
            </p>

            <h1 className="max-w-2xl text-balance text-[2.125rem] font-semibold leading-[1.15] tracking-tight text-ink sm:text-[2.5rem] sm:leading-[1.12] lg:text-[2.75rem] lg:leading-[1.08]">
              Barangmu mungkin lebih dekat dari yang kamu kira.
            </h1>

            <p className="max-w-xl text-pretty text-base leading-7 text-body sm:text-lg sm:leading-8">
              Vinix L&amp;F membantu seluruh karyawan mencari, melaporkan, dan mengambil barang dengan proses verifikasi yang aman serta transparan.
            </p>

            {/* Integrated Search Bar */}
            <form onSubmit={handleSearch} className="max-w-xl">
              <div className="flex flex-col gap-2 rounded-surface border border-line bg-surface p-1.5 shadow-card transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Cari dompet, kunci, botol minum..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Cari dompet, kunci, botol minum..."
                    className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] text-ink placeholder:text-muted focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-brand px-4 text-sm font-semibold text-inverse transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2"
                >
                  Cari Barang
                </button>
              </div>
            </form>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
              <Link
                href="/cari"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Search className="size-4" aria-hidden="true" />
                <span>Cari Barang</span>
              </Link>
              <Link
                href="/lapor"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <PlusCircle className="size-4" aria-hidden="true" />
                <span>Lapor Barang</span>
              </Link>
            </div>

            <p className="text-xs leading-5 text-muted">
              Tersedia untuk karyawan PT. Vinix Seven Aurum.
            </p>
          </div>

          {/* Right Column: Hero Visual */}
          <div className="lg:col-span-5">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-card border border-line bg-surface-muted">
              <Image
                src="/images/hero-lost-found.png"
                alt="Penyerahan barang temuan di lingkungan kantor PT. Vinix Seven Aurum"
                fill
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover"
                priority
              />

              {/* Top Badge */}
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-pill border border-line bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-card">
                <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                <span>Layanan Lost &amp; Found internal</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section: Barang Ditemukan 24 Jam Terakhir */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Katalog Terbaru
            </p>
            <h2 className="text-balance text-[1.375rem] font-semibold leading-[1.2] text-ink sm:text-[1.75rem]">
              Barang Ditemukan 24 Jam Terakhir
            </h2>
          </div>
          <Link
            href="/cari"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span>Lihat semua barang</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        {catalogError && (
          <p role="alert" className="text-sm text-danger">
            {catalogError}
          </p>
        )}
        {recentItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : !catalogError && (
          <div className="rounded-card border border-line bg-surface px-6 py-10 text-center text-sm text-body">
            Belum ada barang temuan yang dipublikasikan.
          </div>
        )}
      </section>

      {/* Feature Strip (Vinix Care System) */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:mt-20 sm:px-6 lg:px-8">
        <div className="rounded-card border border-line bg-surface p-6 sm:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-3 lg:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Vinix Care System
              </p>
              <h3 className="text-balance text-[1.375rem] font-semibold leading-[1.25] text-ink sm:text-2xl">
                Lebih cepat ditemukan. Lebih aman diklaim.
              </h3>
              <p className="text-pretty text-sm leading-6 text-body">
                Tiga lapisan layanan menjaga proses pencarian dan pengembalian barang tetap terpercaya.
              </p>
            </div>

            <div className="divide-y divide-line border-t border-line lg:col-span-8 lg:border-t-0">
              <div className="flex gap-4 py-5 first:pt-0 lg:py-4 lg:first:pt-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-surface bg-surface-muted text-ink">
                  <Search className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink">Smart Search</h4>
                  <p className="text-pretty text-[13px] leading-5 text-body">
                    Cocokkan nama barang, kategori, lokasi, dan tanggal temuan secara otomatis.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 py-5 lg:py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-surface bg-surface-muted text-ink">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink">Secret Ownership</h4>
                  <p className="text-pretty text-[13px] leading-5 text-body">
                    Ciri rahasia hanya diverifikasi petugas di posko untuk mencegah klaim palsu.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 py-5 lg:py-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-surface bg-surface-muted text-ink">
                  <Clock className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-ink">Real-Time Tracking</h4>
                  <p className="text-pretty text-[13px] leading-5 text-body">
                    Pantau setiap tahap penanganan dari laporan diterima hingga barang berhasil diserahkan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
