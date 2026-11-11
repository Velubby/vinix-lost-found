'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Mail, MapPin, Clock } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/auth';
import { DEFAULT_PICKUP_LOCATION, OFFICE_ADDRESS, OFFICE_NAME } from '@/lib/locations';

export default function Footer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => setIsAuthenticated(Boolean(user)));
  }, []);

  return (
    <footer
      className="site-footer mt-auto px-4 py-12 sm:px-6 lg:px-8"
      style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_1.1fr] lg:gap-14">
        {/* Brand */}
        <div className="space-y-4">
          <div className="inline-flex rounded-surface bg-white px-3 py-2">
            <Image
              src="/logo.svg"
              alt="Vinix Lost & Found Logo"
              width={426}
              height={92}
              className="h-7 w-auto"
            />
          </div>
          <p className="max-w-sm text-pretty text-sm leading-6 text-line-strong">
            Sistem internal Lost & Found untuk karyawan PT. Vinix Seven Aurum agar barang hilang dan temuan tertangani dengan aman dan transparan.
          </p>
          <p className="text-xs leading-5 text-line-strong/75">
            © 2026 PT. Vinix Seven Aurum. All rights reserved.
          </p>
        </div>

        {/* Bantuan */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white">Bantuan</h3>
          <ul className="mt-3 text-sm text-line-strong">
            <li>
              <Link
                href="/bantuan"
                className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
              >
                Panduan klaim barang
              </Link>
            </li>
            <li>
              <Link
                href="/bantuan#faq"
                className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
              >
                FAQ layanan Lost &amp; Found
              </Link>
            </li>
            <li>
              <Link
                href="/bantuan#privasi"
                className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
              >
                Kebijakan privasi data karyawan
              </Link>
            </li>
            {isAuthenticated && (
              <li>
                <Link
                  href="/lacak"
                  className="inline-flex min-h-11 items-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
                >
                  Lacak status laporan
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Layanan internal & lokasi */}
        <div className="space-y-7">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white">Layanan Internal</h3>
            <div className="mt-3 space-y-2.5 text-sm leading-6 text-line-strong">
              <p className="flex items-start gap-2.5">
                <Clock className="mt-1 size-4 shrink-0 text-line-strong" aria-hidden="true" />
                <span>Waktu penanganan mengikuti jam operasional dan ketersediaan petugas.</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-line-strong" aria-hidden="true" />
                <a
                  href="mailto:lostfound@vinixsevenaurum.co.id"
                  className="break-all transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight/60"
                >
                  lostfound@vinixsevenaurum.co.id
                </a>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
              Lokasi Kantor &amp; Pengambilan
            </h3>
            <div className="mt-3 space-y-2.5 text-sm leading-6 text-line-strong">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-1 size-4 shrink-0 text-line-strong" aria-hidden="true" />
                <span>
                  {OFFICE_NAME}
                  <br />
                  {OFFICE_ADDRESS}
                </span>
              </p>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-1 size-4 shrink-0 text-line-strong" aria-hidden="true" />
                <span>Titik pengambilan utama: {DEFAULT_PICKUP_LOCATION} (lihat detail pada tiket/klaim).</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
