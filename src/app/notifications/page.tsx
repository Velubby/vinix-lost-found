'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, AlertCircle, Clock, X, ChevronRight, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { formatDate } from '@/lib/date';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import type { NotificationRow } from '@/lib/supabase/notifications';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

function relativeTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return formatDate(d.toISOString());
}

type NotificationIconProps = { type: NotificationRow['type'] };

function NotificationIcon({ type }: NotificationIconProps) {
  const icons: Record<NotificationRow['type'], React.ReactNode> = {
    report: <Bell className="size-4 text-info" aria-hidden="true" />,
    claim: <Mail className="size-4 text-warning" aria-hidden="true" />,
    pickup: <Clock className="size-4 text-success" aria-hidden="true" />,
    system: <AlertCircle className="size-4 text-muted" aria-hidden="true" />,
  };
  return icons[type];
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted sm:px-6 lg:px-8">
        <Clock className="mx-auto mb-3 size-8 animate-spin text-accent" aria-hidden="true" />
        <p className="text-sm font-medium">Memuat notifikasi Anda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div role="alert" className="inline-flex items-center gap-2 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Notifikasi Anda"
        title="Notifikasi"
        description="Pembaruan status laporan, klaim, dan penjemputan barang Anda."
        actions={
          <>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  markAllRead.mutate();
                  toast.success('Semua notifikasi ditandai sebagai dibaca');
                }}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? 'Sedang memproses...' : 'Tandai semua dibaca'}
              </Button>
            )}
            <Link href="/laporan-saya" className="btn-secondary">
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              Kembali ke Laporan Saya
            </Link>
          </>
        }
      />

      {notifications.length === 0 && (
        <EmptyState
          icon={<Bell className="size-6" aria-hidden="true" />}
          title="Belum ada notifikasi"
          description="Notifikasi akan muncul di sini ketika ada pembaruan status laporan, klaim, atau penjemputan barang Anda."
        />
      )}

      {notifications.length > 0 && (
        <section aria-label="Daftar Notifikasi" className="space-y-2.5">
          {notifications.map((n) => {
            const handleOpen = () => {
              if (!n.link) return;
              if (!n.read && !markRead.isPending) {
                markRead.mutate(n.id);
              }
              router.push(n.link);
            };
            return (
              <div
                key={n.id}
                onClick={n.link ? handleOpen : undefined}
                className={[
                  'rounded-card border p-4 transition-colors sm:p-5',
                  n.read
                    ? 'border-line bg-surface hover:border-line-strong'
                    : 'border-info/25 bg-surface ring-1 ring-info/10 hover:border-info/40',
                  n.link ? 'cursor-pointer' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className={[
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-surface',
                        n.read ? 'bg-surface-muted text-ink' : 'bg-info-soft text-ink',
                      ].join(' ')}
                    >
                      <NotificationIcon type={n.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className={`text-balance text-[13px] font-semibold leading-snug ${n.read ? 'text-body' : 'text-ink'}`}>
                          {n.title}
                        </h3>
                        <span
                          className={[
                            'shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold',
                            n.read ? 'bg-surface-muted text-muted' : 'bg-accent text-inverse',
                          ].join(' ')}
                        >
                          {n.read ? 'Dibaca' : 'Baru'}
                        </span>
                      </div>
                      <p className="text-pretty text-[13px] leading-5 text-body">
                        {n.body || '-'}
                      </p>
                      <span className="mt-2 block text-xs font-medium tabular-nums text-muted">
                        {relativeTime(n.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-start gap-1.5">
                    {n.link && (
                      <Link
                        href={n.link}
                        className="flex size-11 items-center justify-center rounded-control text-body transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!n.read && !markRead.isPending) {
                            markRead.mutate(n.id);
                          }
                        }}
                        aria-label={`Buka notifikasi: ${n.title}`}
                      >
                        <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.read && !markRead.isPending) {
                          markRead.mutate(n.id);
                          toast.success('Notifikasi ditandai sebagai dibaca');
                        }
                      }}
                      disabled={markRead.isPending || n.read}
                      aria-label="Tandai dibaca"
                      className={[
                        'flex size-11 items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        n.read
                          ? 'text-muted'
                          : 'text-danger hover:bg-danger-soft hover:text-danger',
                      ].join(' ')}
                    >
                      {n.read ? (
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                      ) : (
                        <X className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Footer action */}
      <div className="flex justify-center py-4">
        <Link
          href="/laporan-saya"
          className="inline-flex min-h-11 items-center gap-2 text-[13px] font-medium text-accent transition-colors hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          Kelola Laporan Saya
        </Link>
      </div>
    </div>
  );
}
