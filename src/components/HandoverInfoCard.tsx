import Link from 'next/link';
import { ArrowRight, Building2, Clock, IdCard, MapPin } from 'lucide-react';
import { OFFICE_ADDRESS, OFFICE_HOURS, OFFICE_NAME } from '@/lib/locations';

interface HandoverInfoCardProps {
  title?: string;
  /** Desk or storage point, e.g. "Resepsionis / Lobi Utama VINIX7" */
  location: string;
  note?: string;
}

/**
 * Real operational details for every physical handover point (found item
 * drop-off, lost item pickup, approved claim pickup). Callers pass the
 * desk/storage location for that flow; the office address, hours, and
 * identity documents are the same for all three.
 */
export function HandoverInfoCard({
  title = 'Detail penyerahan',
  location,
  note,
}: HandoverInfoCardProps) {
  return (
    <div className="space-y-3 rounded-surface border border-line bg-surface px-4 py-3.5">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <ul className="space-y-2 text-[13px] leading-5 text-body">
        <li className="flex items-start gap-2">
          <Building2 className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Lokasi:</span> {location}, {OFFICE_NAME}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Alamat:</span> {OFFICE_ADDRESS}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Jam layanan:</span> {OFFICE_HOURS}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <IdCard className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Bawa:</span> ID karyawan/KTP
            {note ? <span className="block text-xs text-muted">{note}</span> : null}
          </span>
        </li>
      </ul>
      <Link
        href="/bantuan"
        className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-brand"
      >
        Panduan pengambilan <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
