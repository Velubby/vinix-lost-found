import Image from 'next/image';
import type { ReactNode } from 'react';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-card border border-line bg-surface md:grid-cols-2">
        {/* Brand panel */}
        <aside className="hidden flex-col justify-between gap-10 bg-brand p-8 text-inverse md:flex lg:p-10">
          <div className="space-y-8">
            <div className="inline-flex w-fit rounded-surface bg-white px-3 py-2">
              <Image
                src="/logo.svg"
                alt="Vinix Lost & Found Logo"
                width={426}
                height={92}
                className="h-7 w-auto"
                priority
              />
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-highlight">
                Lost &amp; Found internal PT. Vinix Seven Aurum
              </p>
              <h2 className="text-balance text-2xl font-semibold leading-8 text-white">
                Laporkan dan lacak barang hilang/temuan di lingkungan kantor.
              </h2>
              <p className="text-pretty text-sm leading-6 text-white/70">
                Masuk menggunakan email perusahaan untuk mengakses laporan dan klaim Anda.
              </p>
            </div>
          </div>

          <div className="h-1 w-10 rounded-pill bg-highlight" aria-hidden="true" />
        </aside>

        {/* Form panel */}
        <div className="p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
