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
    <footer className="site-footer py-14 px-4 sm:px-6 lg:px-8 mt-auto" style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* Col 1 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white/10 p-0.5">
              <Image
                src="/logo.svg"
                alt="Vinix Lost & Found Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-white text-lg">Vinix L&amp;F</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Sistem internal Lost & Found untuk karyawan PT. Vinix Seven Aurum agar barang hilang dan temuan tertangani dengan aman dan transparan.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            © 2026 PT. Vinix Seven Aurum. All rights reserved.
          </div>
        </div>

        {/* Col 2 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Bantuan</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/bantuan" className="inline-flex min-h-11 items-center hover:text-white transition-colors">
                Panduan klaim barang
              </Link>
            </li>
            <li>
              <Link href="/bantuan#faq" className="inline-flex min-h-11 items-center hover:text-white transition-colors">
                FAQ layanan Lost &amp; Found
              </Link>
            </li>
            <li>
              <Link href="/bantuan#privasi" className="inline-flex min-h-11 items-center hover:text-white transition-colors">
                Kebijakan privasi data karyawan
              </Link>
            </li>
            {isAuthenticated && <li>
              <Link href="/lacak" className="inline-flex min-h-11 items-center hover:text-white transition-colors">
                Lacak status laporan
              </Link>
            </li>}
          </ul>
        </div>

        {/* Col 3 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Layanan Internal</h3>
          <div className="space-y-2.5 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>Waktu penanganan mengikuti jam operasional dan ketersediaan petugas.</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <a href="mailto:lostfound@vinixsevenaurum.co.id" className="hover:text-white transition-colors">
                lostfound@vinixsevenaurum.co.id
              </a>
            </p>
          </div>
        </div>

        {/* Col 4 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Lokasi Kantor &amp; Pengambilan</h3>
          <div className="space-y-2.5 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>{OFFICE_NAME}<br />{OFFICE_ADDRESS}</span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>Titik pengambilan utama: {DEFAULT_PICKUP_LOCATION} (lihat detail pada tiket/klaim).</span>
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
