'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { DEFAULT_PICKUP_LOCATION, OFFICE_ADDRESS, OFFICE_NAME } from '@/lib/locations';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Apakah saya harus masuk terlebih dahulu untuk mengklaim barang?',
      a: 'Ya, Anda perlu masuk menggunakan akun email perusahaan agar identitas dapat diverifikasi oleh petugas sebelum proses serah terima.'
    },
    {
      q: 'Bagaimana jika barang saya belum muncul di katalog pencarian?',
      a: 'Buat laporan melalui menu Lapor Barang. Sistem akan menyimpan laporan Anda dan membantu pencocokan saat ada barang temuan yang relevan.'
    },
    {
      q: 'Bagaimana proses verifikasi kepemilikan barang?',
      a: 'Petugas akan meninjau bukti dan ciri kepemilikan yang Anda kirimkan. Waktu penanganan mengikuti ketersediaan petugas; pantau pembaruan status pada halaman Lacak atau Laporan Saya.'
    },
    {
      q: 'Di mana pengambilan barang yang klaimnya disetujui?',
      a: `Pengambilan dilakukan di ${DEFAULT_PICKUP_LOCATION}, ${OFFICE_NAME} (${OFFICE_ADDRESS}) pada jam kerja kantor. Tunjukkan tiket klaim dan kartu identitas (ID karyawan/KTP) saat verifikasi.`
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block">
          Pusat Bantuan
        </span>
        <h1 className="text-3xl font-extrabold text-[#123356]">
          Bagaimana kami bisa membantumu?
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Panduan langkah, jawaban pertanyaan umum, dan informasi penanganan Lost &amp; Found di {OFFICE_NAME}.
        </p>
      </div>

      {/* 4 Panduan Steps (Apple Card) */}
      <div className="apple-card p-6 sm:p-8 bg-white space-y-6">
        <h2 className="text-base font-bold text-[#123356]">Panduan Alur Layanan</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-[#123356] text-white flex items-center justify-center font-bold text-xs">1</span>
            <h3 className="font-bold text-xs text-slate-900">Cari Barang</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Gunakan kata kunci dan filter lokasi untuk mengecek barang temuan terbaru.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-[#123356] text-white flex items-center justify-center font-bold text-xs">2</span>
            <h3 className="font-bold text-xs text-slate-900">Lapor Barang</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Isi formulir barang hilang atau temuan beserta ciri umum dan lokasi kejadian.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-[#123356] text-white flex items-center justify-center font-bold text-xs">3</span>
            <h3 className="font-bold text-xs text-slate-900">Klaim Rahasia</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Jawab pertanyaan ciri privat untuk membuktikan kepemilikan Anda kepada petugas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="w-6 h-6 rounded-full bg-[#123356] text-white flex items-center justify-center font-bold text-xs">4</span>
            <h3 className="font-bold text-xs text-slate-900">Ambil Barang</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Datang ke lokasi pengambilan yang tertera pada tiket dengan membawa identitas setelah klaim disetujui.
            </p>
          </div>
        </div>
      </div>

      {/* Accordion FAQ */}
      <div id="faq" className="apple-card p-6 sm:p-8 bg-white space-y-4">
        <h2 className="text-base font-bold text-[#123356] pb-2 border-b border-slate-100">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left font-bold text-xs sm:text-sm text-[#123356] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy Notice Card */}
      <div id="privasi" className="apple-card p-6 bg-sky-50/60 border border-sky-100 flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-sky-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-sky-900">Kebijakan Privasi &amp; Keamanan</h3>
          <p className="text-xs text-sky-800 leading-relaxed">
            Sistem tidak mempublikasikan data identitas pribadi, foto kartu, atau nomor seri barang ke publik. Verifikasi ciri khusus barang dilakukan secara terbatas antara pelapor/pemohon dan petugas berwenang.
          </p>
        </div>
      </div>

    </div>
  );
}
