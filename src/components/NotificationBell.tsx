'use client';

import { useState } from 'react';
import { Bell, X, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/date';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
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

export function NotificationBell() {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    markAllRead.mutate();
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        )}
      {open && (
        <div className="absolute right-0 top-14 z-[60] w-[360px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-[#123356] tracking-tight">Notifikasi</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Memuat notifikasi...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Bell className="w-8 h-8 opacity-50" />
                  <p className="text-sm">Belum ada notifikasi</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || '/laporan-saya'}
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      setOpen(false);
                    }}
                    className="block px-4 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {n.read ? null : (
                            <div className="flex h-2 w-2 items-center justify-center shrink-0 mt-1.5">
                              <div className="h-2 w-2 rounded-full bg-[#123356]" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-tight group-hover:text-[#123356]">
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                              {n.body || ''}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {relativeTime(n.created_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead.mutate(n.id);
                        }}
                        disabled={markRead.isPending}
                        aria-label="Tandai dibaca"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                      >
                        {!n.read ? (
                          <X className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <Link
              href="/notifications"
              className="flex items-center w-full px-3 py-2 text-xs sm:text-sm text-sky-700 font-medium hover:bg-sky-50 rounded-lg min-h-11"
            >
              <ChevronRight className="w-3.5 h-3.5 shrink-0 mr-2" />
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
