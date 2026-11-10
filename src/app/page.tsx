'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, PlusCircle, ArrowRight, ShieldCheck, Clock, MapPin, Sparkles } from 'lucide-react';
import { fetchCatalogItems, type CatalogItem } from '@/lib/supabase/items';

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
    <div className="space-y-16 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy & Search */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/80 border border-sky-200 text-sky-900 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Layanan Internal Kantor</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#123356] leading-[1.12]">
              Barangmu mungkin lebih dekat dari yang kamu kira.
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
              Vinix L&amp;F membantu seluruh karyawan mencari, melaporkan, dan mengambil barang dengan proses verifikasi yang aman serta transparan.
            </p>

            {/* Integrated Search Bar */}
            <form onSubmit={handleSearch} className="max-w-xl">
              <div className="relative flex items-center p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-md focus-within:ring-3 focus-within:ring-sky-500/20 focus-within:border-sky-500 transition-all">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Cari dompet, kunci, botol minum..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 text-sm sm:text-base text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#123356] hover:bg-[#0c233c] text-white text-sm font-semibold tracking-wide shrink-0 transition-transform active:scale-95 shadow-sm"
                >
                  Cari Barang
                </button>
              </div>
            </form>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/cari"
                className="btn-primary"
              >
                <Search className="w-4 h-4" />
                <span>Cari Barang</span>
              </Link>
              <Link
                href="/lapor"
                className="btn-secondary"
              >
                <PlusCircle className="w-4 h-4 text-slate-600" />
                <span>Lapor Barang</span>
              </Link>
            </div>

            <p className="text-xs text-slate-400 pt-1">
              Tersedia untuk karyawan PT. Vinix Seven Aurum.
            </p>
          </div>

          {/* Right Column: Hero Visual with Apple Frosted Overlays */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden p-2 bg-gradient-to-b from-white/80 to-white/40 border border-black/5 shadow-2xl backdrop-blur-xl">

              {/* Main Photo */}
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden">
                <Image
                  src="/images/hero-lost-found.png"
                  alt="Penyerahan barang temuan di lingkungan kantor PT. Vinix Seven Aurum"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/60 shadow-md flex items-center gap-2 text-xs font-semibold text-[#123356]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Layanan Lost &amp; Found internal</span>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Catalog Section: Barang Ditemukan 24 Jam Terakhir */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-slate-200/80 gap-4">
          <div>
            <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block mb-1">
              Katalog Terbaru
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123356]">
              Barang Ditemukan 24 Jam Terakhir
            </h2>
          </div>
          <Link
            href="/cari"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-900 group"
          >
            <span>Lihat semua barang</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 4 Cards Grid (Apple Aesthetics) */}
        {catalogError && <p role="alert" className="text-sm text-rose-700">{catalogError}</p>}
        {recentItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentItems.map((item) => (
            <article
              key={item.id}
              className="apple-card group flex flex-col overflow-hidden"
            >
              {/* Card Image */}
              <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : <div className="h-full w-full bg-slate-200" aria-label="Foto belum tersedia" />}
                <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-xs border border-white/60 uppercase">
                  {item.categoryTag}
                </span>
              </div>

              {/* Card Details */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-base text-[#123356] group-hover:text-sky-700 transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center gap-1.5 text-xs text-sky-700 font-semibold mt-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.location}</span>
                  <span>·</span>
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.time}</span>
                </div>

                <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed flex-1">
                  {item.description}
                </p>

                <div className="pt-4 mt-auto">
                  <Link
                    href={`/barang/${item.id}`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-[#123356] hover:text-white text-[#123356] text-xs font-semibold text-center block transition-all"
                  >
                    Lihat Detail
                  </Link>
                </div>
              </div>
            </article>
            ))}
          </div>
        ) : !catalogError && (
          <div className="apple-card p-8 text-center text-sm text-slate-500">
            Belum ada barang temuan yang dipublikasikan.
          </div>
        )}

      </section>

      {/* Feature Strip (Vinix Care System from Figma) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="apple-card p-6 sm:p-8 bg-white/90 backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-4 space-y-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Vinix Care System
              </span>
              <h3 className="text-2xl font-extrabold text-[#123356]">
                Lebih cepat ditemukan. Lebih aman diklaim.
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tiga lapisan layanan menjaga proses pencarian dan pengembalian barang tetap terpercaya.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Smart Search</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cocokkan nama barang, kategori, lokasi, dan tanggal temuan secara otomatis.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Secret Ownership</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ciri rahasia hanya diverifikasi petugas di posko untuk mencegah klaim palsu.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Real-Time Tracking</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pantau setiap tahap penanganan dari laporan diterima hingga barang berhasil diserahkan.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
