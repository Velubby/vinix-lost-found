'use client';

import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { DEFAULT_PICKUP_LOCATION, OFFICE_ADDRESS, OFFICE_NAME } from '@/lib/locations';
import { PageHeader } from '@/components/ui/PageHeader';

const GUIDE_STEPS = [
  {
    title: 'Cari Barang',
    description: 'Gunakan kata kunci dan filter lokasi untuk mengecek barang temuan terbaru.',
  },
  {
    title: 'Lapor Barang',
    description: 'Isi formulir barang hilang atau temuan beserta ciri umum dan lokasi kejadian.',
  },
  {
    title: 'Klaim Rahasia',
    description: 'Jawab pertanyaan ciri privat untuk membuktikan kepemilikan Anda kepada petugas.',
  },
  {
    title: 'Ambil Barang',
    description: 'Datang ke lokasi pengambilan yang tertera pada tiket dengan membawa identitas setelah klaim disetujui.',
  },
];

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
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Pusat Bantuan"
        title="Bagaimana kami bisa membantumu?"
        description={`Panduan langkah, jawaban pertanyaan umum, dan informasi penanganan Lost & Found di ${OFFICE_NAME}.`}
      />

      {/* 4 Panduan Steps */}
      <section className="space-y-6 rounded-card border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-[17px] font-semibold text-ink">Panduan Alur Layanan</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDE_STEPS.map((step, index) => (
            <div key={step.title} className="space-y-1.5 rounded-surface border border-line bg-surface-muted p-4">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand text-xs font-semibold text-inverse">
                {index + 1}
              </span>
              <h3 className="text-[13px] font-semibold text-ink">{step.title}</h3>
              <p className="text-pretty text-xs leading-5 text-body">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Accordion FAQ */}
      <section id="faq" className="space-y-4 rounded-card border border-line bg-surface p-6 sm:p-8">
        <h2 className="border-b border-line pb-3 text-[17px] font-semibold text-ink">
          Pertanyaan yang Sering Diajukan (FAQ)
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-surface border border-line"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${idx}`}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:text-sm"
                >
                  <span className="text-pretty">{faq.q}</span>
                  <ChevronDown
                    className={`size-4 shrink-0 text-muted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${idx}`}
                    className="border-t border-line bg-surface-muted px-4 py-3 text-pretty text-[13px] leading-5 text-body"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Privacy Notice Card */}
      <section id="privasi" className="flex items-start gap-4 rounded-card border border-info/20 bg-info-soft p-5 sm:p-6">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-ink">Kebijakan Privasi &amp; Keamanan</h3>
          <p className="text-pretty text-[13px] leading-5 text-body">
            Sistem tidak mempublikasikan data identitas pribadi, foto kartu, atau nomor seri barang ke publik. Verifikasi ciri khusus barang dilakukan secara terbatas antara pelapor/pemohon dan petugas berwenang.
          </p>
        </div>
      </section>
    </div>
  );
}
