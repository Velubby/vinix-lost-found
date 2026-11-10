'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, PlusCircle, PackageSearch, FileText, Clock, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/date';
import { fetchLatestUserReport, type UserReportRow } from '@/lib/supabase/reports';

export default function DashboardPage() {
  const [userName, setUserName] = useState('Karyawan');
  const [activeReportCount, setActiveReportCount] = useState(0);
  const [latestReport, setLatestReport] = useState<UserReportRow | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const user = await getCurrentUser();
      setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Karyawan');
      if (user) {
        const supabase = createClient();
        const { count } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['aktif', 'ditemukan', 'klaim']);
        setActiveReportCount(count || 0);
        const { report } = await fetchLatestUserReport();
        setLatestReport(report);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123356] tracking-tight">
            Selamat datang, {userName}.
          </h1>
          <p className="text-base text-slate-600 mt-1">
            Apa yang ingin kamu lakukan hari ini?
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/90 text-sky-800 text-xs font-bold uppercase tracking-wider self-start sm:self-auto border border-sky-200">
          <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
          <span>{activeReportCount} Laporan Aktif</span>
        </div>
      </div>

      {/* Action cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Cari Barang (Featured Dark Blue Card) */}
        <div className="rounded-2xl p-6 bg-[#123356] text-white flex flex-col justify-between shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/5 rounded-full pointer-events-none transition-transform group-hover:scale-125" />
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Cari Barang</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Telusuri katalog barang temuan dengan pencarian berdasarkan kategori, lokasi, dan tanggal.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/cari"
              className="w-full py-2.5 px-4 rounded-xl bg-white text-[#123356] hover:bg-sky-50 text-xs font-bold text-center block transition-all shadow-xs active:scale-95"
            >
              Mulai Pencarian
            </Link>
          </div>
        </div>

        {/* Card 2: Lapor Barang Hilang */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#123356]">Lapor Barang Hilang</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Buat laporan agar tim internal membantu pencarian di area kantor dan pos/penyimpanan barang.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/lapor?type=hilang"
              className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1.5 group"
            >
              <span>Buat Laporan Hilang</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Card 3: Lapor Barang Temuan */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#123356]">Lapor Barang Temuan</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bantu pemilik menemukan kembali barangnya dengan mencatat lokasi dan ciri umumnya.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/lapor?type=temuan"
              className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1.5 group"
            >
              <span>Laporkan Barang Temuan</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Card 4: Laporan Saya */}
        <div className="apple-card p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <PackageSearch className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#123356]">Laporan Saya</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pantau progres status verifikasi laporan dan tindak lanjuti klaim kepemilikanmu.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/laporan-saya"
              className="text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1.5 group"
            >
              <span>Lihat Semua Laporan</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

      </div>

      {/* Active Report Banner */}
      {latestReport && (
      <div className="rounded-2xl p-5 bg-sky-50/80 border border-sky-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-[#123356]">{latestReport.item_title}</span>
              <span className="text-xs text-slate-500">· {latestReport.report_code}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {latestReport.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {latestReport.public_description} · Diperbarui {formatDate(latestReport.updated_at)}
            </p>
          </div>
        </div>

        <Link
          href={`/lacak?report=${latestReport.id}`}
          className="btn-primary text-xs py-2 px-4 shrink-0"
        >
          Lacak Laporan
        </Link>
      </div>
      )}

      {/* Vinix Care System Strip */}
      <div className="apple-card p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4 space-y-1">
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
              Vinix Care System
            </span>
            <h3 className="text-xl font-extrabold text-[#123356]">
              Lebih cepat ditemukan. Lebih aman diklaim.
            </h3>
            <p className="text-xs text-slate-500">
              Tiga pilar layanan menjaga keamanan barang setiap karyawan.
            </p>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">Smart Search</span>
              <p className="text-[11px] text-slate-500">
                Pencarian instan berdasarkan kategori dan lokasi di area kantor.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">Secret Ownership</span>
              <p className="text-[11px] text-slate-500">
                Ciri privat terjaga aman dan hanya dibuka saat verifikasi fisik.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              <span className="text-xs font-bold text-slate-800 block">Real-Time Tracking</span>
              <p className="text-[11px] text-slate-500">
                Pembaruan status langsung di layar tanpa perlu bolak-balik ke pos.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
