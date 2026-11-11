'use client';

import { useState } from 'react';
import { Bell, X, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/date';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';

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
        className="relative flex size-11 items-center justify-center rounded-control text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-pill bg-danger text-[11px] font-semibold leading-none text-white ring-2 ring-surface">
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
        <div className="absolute right-0 top-[calc(100%+8px)] z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-overlay animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Notifikasi</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-xs font-semibold text-accent transition-colors hover:text-brand disabled:opacity-50"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted">Memuat notifikasi...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-2 text-muted">
                  <Bell className="size-8 opacity-60" aria-hidden="true" />
                  <p className="text-sm">Belum ada notifikasi</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link || '/laporan-saya'}
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id);
                      setOpen(false);
                    }}
                    className="group block px-4 py-3.5 transition-colors hover:bg-surface-muted"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {n.read ? null : (
                            <div className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
                              <span className="size-2 rounded-full bg-accent" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold leading-snug text-ink">
                              {n.title}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-muted">
                              {n.body || ''}
                            </p>
                          </div>
                        </div>
                        <span className="mt-1 block text-xs tabular-nums text-muted">
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
                        className="flex size-9 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        {!n.read ? (
                          <X className="size-3.5" />
                        ) : (
                          <Clock className="size-3.5 opacity-50" />
                        )}
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line bg-surface-muted px-3 py-2">
            <Link
              href="/notifications"
              className="flex min-h-11 w-full items-center rounded-control px-3 text-xs font-medium text-accent transition-colors hover:bg-surface hover:text-brand sm:text-sm"
            >
              <ChevronRight className="mr-2 size-3.5 shrink-0" aria-hidden="true" />
              Lihat semua notifikasi
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
