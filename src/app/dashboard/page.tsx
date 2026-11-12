'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, PlusCircle, PackageSearch, FileText, Clock, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/date';
import { fetchLatestUserReport, type UserReportRow } from '@/lib/supabase/reports';

const CARE_PILLARS = [
  {
    title: 'Smart Search',
    description: 'Pencarian instan berdasarkan kategori dan lokasi di area kantor.',
  },
  {
    title: 'Secret Ownership',
    description: 'Ciri privat terjaga aman dan hanya dibuka saat verifikasi fisik.',
  },
  {
    title: 'Real-Time Tracking',
    description: 'Pembaruan status langsung di layar tanpa perlu bolak-balik ke pos.',
  },
];

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
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header Greeting */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-[2.125rem] sm:leading-[1.15]">
            Selamat datang, {userName}.
          </h1>
          <p className="text-pretty text-sm leading-6 text-body">
            Apa yang ingin kamu lakukan hari ini?
          </p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-body">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          <span>{activeReportCount} Laporan Aktif</span>
        </span>
      </div>

      {/* Action cards grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Cari Barang (Featured Dark Blue Card) */}
        <div className="flex flex-col justify-between rounded-card bg-brand p-5 text-inverse">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-surface bg-white/10">
              <Search className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-[17px] font-semibold leading-6 text-white">Cari Barang</h2>
            <p className="text-pretty text-[13px] leading-5 text-white/70">
              Telusuri katalog barang temuan dengan pencarian berdasarkan kategori, lokasi, dan tanggal.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/cari"
              className="flex min-h-11 w-full items-center justify-center rounded-control bg-surface px-4 text-center text-[13px] font-semibold text-brand transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
            >
              Mulai Pencarian
            </Link>
          </div>
        </div>

        {/* Card 2: Lapor Barang Hilang */}
        <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-5">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-surface bg-surface-muted text-ink">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-[17px] font-semibold leading-6 text-ink">Lapor Barang Hilang</h2>
            <p className="text-pretty text-[13px] leading-5 text-body">
              Buat laporan agar tim internal membantu pencarian di area kantor dan pos/penyimpanan barang.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/lapor?type=hilang"
              className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span>Buat Laporan Hilang</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Card 3: Lapor Barang Temuan */}
        <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-5">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-surface bg-surface-muted text-ink">
              <PlusCircle className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-[17px] font-semibold leading-6 text-ink">Lapor Barang Temuan</h2>
            <p className="text-pretty text-[13px] leading-5 text-body">
              Bantu pemilik menemukan kembali barangnya dengan mencatat lokasi dan ciri umumnya.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/lapor?type=temuan"
              className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span>Laporkan Barang Temuan</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Card 4: Laporan Saya */}
        <div className="flex flex-col justify-between rounded-card border border-line bg-surface p-5">
          <div className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-surface bg-surface-muted text-ink">
              <PackageSearch className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-[17px] font-semibold leading-6 text-ink">Laporan Saya</h2>
            <p className="text-pretty text-[13px] leading-5 text-body">
              Pantau progres status verifikasi laporan dan tindak lanjuti klaim kepemilikanmu.
            </p>
          </div>
          <div className="pt-6">
            <Link
              href="/laporan-saya"
              className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <span>Lihat Semua Laporan</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Report Banner */}
      {latestReport && (
        <div className="flex flex-col justify-between gap-4 rounded-card border border-line bg-info-soft p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-start gap-3.5 sm:items-center">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-surface bg-surface text-ink">
              <Clock className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-ink">{latestReport.item_title}</span>
                <span className="text-xs text-muted">· {latestReport.report_code}</span>
                <span className="rounded-pill border border-line bg-surface px-2 py-0.5 text-[11px] font-semibold tracking-wide text-body">
                  {latestReport.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-pretty text-[13px] leading-5 text-body">
                {latestReport.public_description} · Diperbarui {formatDate(latestReport.updated_at)}
              </p>
            </div>
          </div>

          <Link
            href={`/lacak?report=${latestReport.id}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-brand px-4 text-[13px] font-semibold text-inverse transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Lacak Laporan
          </Link>
        </div>
      )}

      {/* Vinix Care System Strip */}
      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-1.5 lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Vinix Care System
            </p>
            <h3 className="text-balance text-xl font-semibold leading-7 text-ink">
              Lebih cepat ditemukan. Lebih aman diklaim.
            </h3>
            <p className="text-pretty text-[13px] leading-5 text-body">
              Tiga pilar layanan menjaga keamanan barang setiap karyawan.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-8">
            {CARE_PILLARS.map((pillar) => (
              <div key={pillar.title} className="space-y-1 rounded-surface border border-line bg-surface-muted p-4">
                <span className="block text-[13px] font-semibold text-ink">{pillar.title}</span>
                <p className="text-pretty text-xs leading-5 text-body">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
