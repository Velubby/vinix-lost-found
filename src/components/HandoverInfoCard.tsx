import Link from 'next/link';
import { ArrowRight, Clock, IdCard, MapPin } from 'lucide-react';
import { OFFICE_HOURS } from '@/lib/locations';

interface HandoverInfoCardProps {
  title?: string;
  /** Label for the location row, e.g. "Serahkan di" or "Ambil di". */
  actionLabel?: string;
  /** Desk or storage point, e.g. "Resepsionis / Lobi Utama VINIX7" */
  location: string;
  note?: string;
}

/**
 * Short practical handover details used at every physical handover point
 * (found item drop-off, lost item pickup): where, what hours, and what the
 * visitor must bring. The office address is shared context on /bantuan.
 */
export function HandoverInfoCard({
  title = 'Serah terima',
  actionLabel = 'Serahkan di',
  location,
  note,
}: HandoverInfoCardProps) {
  return (
    <div className="space-y-2.5 rounded-surface border border-line bg-surface-muted px-4 py-3">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <ul className="space-y-1.5 text-[13px] leading-5 text-body">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="text-muted">{actionLabel}: </span>
            <span className="font-semibold text-ink">{location}</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="text-muted">Waktu: </span>
            <span className="font-semibold text-ink">{OFFICE_HOURS}</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <IdCard className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="text-muted">Bawa: </span>
            <span className="font-semibold text-ink">ID karyawan/KTP</span>
            {note ? <span className="block text-xs text-muted">{note}</span> : null}
          </span>
        </li>
      </ul>
      <Link
        href="/bantuan"
        className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-accent transition-colors hover:text-brand"
      >
        Panduan pengambilan <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
