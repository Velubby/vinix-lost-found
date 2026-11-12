import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin } from 'lucide-react';
import type { CatalogItem } from '@/lib/supabase/items';

interface ItemCardProps {
  item: CatalogItem;
  showDate?: boolean;
  priority?: boolean;
}

export function ItemCard({ item, showDate = false, priority = false }: ItemCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors duration-150 hover:border-line-strong">
      <div className="relative aspect-4/3 w-full overflow-hidden bg-surface-muted">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="size-full bg-surface-muted" aria-label="Foto belum tersedia" />
        )}
        <span className="absolute right-3 top-3 rounded-pill border border-line bg-surface/95 px-2.5 py-1 text-xs font-medium text-body">
          {item.categoryTag}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-balance text-[15px] font-semibold leading-6 text-ink">{item.title}</h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-5 text-muted">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.location}</span>
          <span aria-hidden="true">·</span>
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">
            {showDate ? `${item.date} · ${item.time}` : item.time}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 flex-1 text-pretty text-[13px] leading-5 text-body">
          {item.description}
        </p>

        <div className="mt-5">
          <Link
            href={`/barang/${item.id}`}
            className="flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:border-brand hover:bg-brand hover:text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Lihat Detail
          </Link>
        </div>
      </div>
    </article>
  );
}
