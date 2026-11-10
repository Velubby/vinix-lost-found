'use client';

import { useState } from 'react';
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
    report: <Bell className="w-4 h-4 text-sky-600 shrink-0" />,
    claim: <Mail className="w-4 h-4 text-amber-600 shrink-0" />,
    pickup: <Clock className="w-4 h-4 text-emerald-600 shrink-0" />,
    system: <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />,
  };
  return icons[type];
}

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading, error } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <Clock className="w-8 h-8 animate-spin mx-auto text-sky-600 mb-3" />
        <p className="text-sm font-semibold">Memuat notifikasi Anda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div role="alert" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-800 text-xs font-bold uppercase tracking-wider">
            <Bell className="w-4 h-4 text-sky-600" />
            <span>Notifikasi Anda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#123356] mt-1">
            Notifikasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Pembaruan status laporan, klaim, dan penjemputan barang Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                markAllRead.mutate();
                toast.success('Semua notifikasi ditandai sebagai dibaca');
              }}
              disabled={markAllRead.isPending}
              className="min-h-10"
            >
              {markAllRead.isPending ? 'Sedang memproses...' : 'Tandai semua dibaca'}
            </Button>
          )}
          <Link href="/laporan-saya" className="btn-secondary text-xs min-h-10">
            <ChevronRight className="w-4 h-4 shrink-0 mr-2" />
            Kembali ke Laporan Saya
          </Link>
        </div>
      </header>

      {notifications.length === 0 && (
        <div className="p-12 sm:p-16 text-center border border-slate-100 rounded-2xl bg-slate-50/50">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Bell className="w-12 h-12 opacity-40" />
            <p className="text-sm font-medium text-slate-600">Belum ada notifikasi</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Notifikasi akan muncul di sini ketika ada pembaruan status laporan,
              klaim, atau penjemputan barang Anda.
            </p>
          </div>
        </div>
      )}

      {notifications.length > 0 && (
        <section aria-label="Daftar Notifikasi" className="space-y-2">
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
              className={`p-4 sm:p-5 rounded-2xl border ${
                n.read
                  ? 'border-slate-100 bg-white hover:border-slate-200'
                  : 'border-[#123356]/20 bg-[#123356]/10 ring-1 ring-[#123356]/20'
              } ${n.link ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#123356]/10 text-[#123356] shrink-0 mt-0.5">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-sm font-semibold leading-tight ${n.read ? 'text-slate-800' : 'text-[#123356]'}`}>
                        {n.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.read ? 'bg-slate-100 text-slate-500' : 'bg-[#123356]/10 text-[#123356]'}`}>
                        {n.read ? 'Dibaca' : 'Baru'}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${n.read ? 'text-slate-600' : 'text-slate-700'}`}>
                      {n.body || '-'}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 shrink-0">
                  {n.link && (
                    <Link
                      href={n.link}
                      className={`min-h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${n.read ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-[#123356] hover:bg-[#123356]/10'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!n.read && !markRead.isPending) {
                          markRead.mutate(n.id);
                        }
                      }}
                      aria-label={`Buka notifikasi: ${n.title}`}
                    >
                      <ChevronRight className="w-4 h-4 shrink-0" />
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
                    className={`min-h-10 w-10 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${n.read ? 'text-slate-300 bg-slate-50' : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'}`}
                  >
                    {n.read ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
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
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-sky-700 font-medium hover:underline"
        >
          <Mail className="w-4 h-4 shrink-0" />
          Kelola Laporan Saya
        </Link>
      </div>
    </div>
  );
}
