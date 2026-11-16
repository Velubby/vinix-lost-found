'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fetchCatalogItems, type CatalogItem } from '@/lib/supabase/items';
import { Skeleton } from '@/components/ui/Skeleton';

interface NewFoundItemsDigestProps {
  /** Only items found after this timestamp are shown. */
  since: string;
  limit?: number;
}

/**
 * Shows recent catalog items without pretending to match them to a report.
 * The visitor compares the item details themselves; the catalog remains the
 * single source for the full list.
 */
export function NewFoundItemsDigest({ since, limit = 3 }: NewFoundItemsDigestProps) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchCatalogItems({ since })
      .then((result) => {
        if (!active) return;
        setItems(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError('Barang temuan belum bisa dimuat.');
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [since]);

  const visibleItems = items.slice(0, limit);

  return (
    <section id="barang-temuan-baru" className="scroll-mt-24 rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-ink">Barang temuan baru</h2>
          <p className="text-pretty text-[13px] leading-5 text-body">
            Barang yang masuk ke katalog setelah kejadian ini. Buka satu per satu dan cocokkan ciri barangmu sendiri.
          </p>
        </div>
        <Link
          href="/cari"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control text-[13px] font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Buka katalog <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3 pt-4" aria-busy="true">
          <Skeleton variant="rectangular" className="h-14 w-full" />
          <Skeleton variant="rectangular" className="h-14 w-full" />
          <span className="sr-only">Memuat barang temuan baru.</span>
        </div>
      )}

      {!isLoading && error && (
        <p className="pt-4 text-[13px] leading-5 text-body">
          {error} Coba muat ulang halaman, atau <Link href="/cari" className="font-semibold text-accent hover:text-brand">buka katalog</Link>.
        </p>
      )}

      {!isLoading && !error && visibleItems.length === 0 && (
        <p className="pt-4 text-pretty text-[13px] leading-5 text-body">
          Belum ada barang temuan baru setelah kejadian ini. Cek katalog secara berkala, atau hubungi petugas kalau kamu punya informasi tambahan.
        </p>
      )}

      {!isLoading && !error && visibleItems.length > 0 && (
        <>
          <ul className="divide-y divide-line">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/barang/${item.id}`}
                  className="flex flex-col gap-1 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{item.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">
                      {item.category} · {item.location} · {item.date}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-accent">
                    Lihat barang <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {items.length > limit && (
            <p className="pt-3 text-xs text-muted">
              Menampilkan {limit} barang terbaru dari {items.length} barang temuan baru.
            </p>
          )}
        </>
      )}
    </section>
  );
}
