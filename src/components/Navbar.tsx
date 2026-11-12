'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Search, LogOut, Settings, Menu, X } from 'lucide-react';
import { signOutUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/NotificationBell';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; initials: string; role: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let authVersion = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const version = ++authVersion;
      const user = session?.user;
      if (!user) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      const updateProfile = (role: string) => {
        if (!active || version !== authVersion) return;
        setProfile(name ? { name, initials: name.slice(0, 2).toUpperCase(), role } : null);
        setAuthReady(true);
      };
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        .then(
          ({ data: accountProfile }) => updateProfile(accountProfile?.role || 'user'),
          () => updateProfile('user'),
        );
    });
    return () => {
      active = false;
      authVersion++;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const isCurrent = (path: string) => {
    if (path === '/') return pathname === '/';
    // Exact segment match: /lapor should not match /laporan-saya
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isAuthPage = pathname === '/masuk' || pathname === '/daftar';
  const isAdmin = profile?.role?.toLowerCase() === 'admin';
  const catalogLabel = isAdmin ? 'List Barang' : 'Cari Barang';
  const roleLabel = profile ? (isAdmin ? 'Admin' : 'Karyawan') : 'Akun pengguna';

  const navLink = (path: string) =>
    [
      'relative flex min-h-11 items-center whitespace-nowrap px-1 text-sm transition-colors',
      'after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:rounded-pill after:transition-colors',
      isCurrent(path)
        ? 'font-semibold text-ink after:bg-brand'
        : 'font-medium text-body after:bg-transparent hover:text-ink',
    ].join(' ');

  const mobileNavLink = (path: string) =>
    [
      'flex min-h-12 items-center rounded-control px-3 text-[15px] transition-colors',
      isCurrent(path)
        ? 'bg-surface-muted font-semibold text-ink'
        : 'font-medium text-body hover:bg-surface-muted hover:text-ink',
    ].join(' ');

  const handleLogout = async () => {
    await signOutUser();
    setMenuOpen(false);
    setMobileNavOpen(false);
    toast.success('Berhasil keluar dari akun');
    router.push('/masuk');
    router.refresh();
  };

  return (
    <header className="site-header">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Image
            src="/logo-mark.svg"
            alt=""
            width={53}
            height={29}
            className="h-7 w-auto"
            priority
          />
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold leading-none text-ink">Vinix L&amp;F</span>
            <span className="mt-1 hidden text-[11px] font-medium uppercase leading-none tracking-[0.12em] text-muted sm:block">
              Portal Resmi
            </span>
          </span>
        </Link>

        {/* Center: Navigation Links */}
        {!isAuthPage && authReady && (
          <>
            <nav aria-label="Navigasi Utama" className="hidden items-center gap-4 lg:flex lg:gap-5">
              <Link href="/" className={navLink('/')}>
                Beranda
              </Link>
              <Link href="/dashboard" className={navLink('/dashboard')}>
                Dashboard
              </Link>
              <Link href="/cari" className={navLink('/cari')}>
                {catalogLabel}
              </Link>
              {profile && (
                <Link href="/lapor" className={navLink('/lapor')}>
                  Lapor Barang
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className={navLink('/admin')}>
                  Admin
                </Link>
              )}
              {profile && (
                <Link href="/laporan-saya" className={navLink('/laporan-saya')}>
                  Laporan Saya
                </Link>
              )}
            </nav>

            {/* Mobile menu overlay is portaled to the body below */}
            {mounted && mobileNavOpen && createPortal(
              <div
                id="mobile-nav"
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigasi"
                className="fixed inset-0 z-[60] flex flex-col bg-surface lg:hidden"
              >
                <div
                  className="flex items-center justify-between border-b border-line px-4 py-2.5"
                  style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
                >
                  <span className="flex items-center gap-2.5">
                    <Image src="/logo-mark.svg" alt="" width={44} height={24} className="h-6 w-auto" />
                    <span className="text-[15px] font-semibold text-ink">Vinix L&amp;F</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    aria-label="Tutup menu"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <nav
                  aria-label="Navigasi Seluler"
                  className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
                >
                  <Link href="/" onClick={() => setMobileNavOpen(false)} className={mobileNavLink('/')}>
                    Beranda
                  </Link>
                  <Link href="/dashboard" onClick={() => setMobileNavOpen(false)} className={mobileNavLink('/dashboard')}>
                    Dashboard
                  </Link>
                  <Link href="/cari" onClick={() => setMobileNavOpen(false)} className={mobileNavLink('/cari')}>
                    {catalogLabel}
                  </Link>
                  {profile && (
                    <Link href="/lapor" onClick={() => setMobileNavOpen(false)} className={mobileNavLink('/lapor')}>
                      Lapor Barang
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileNavOpen(false)} className={mobileNavLink('/admin')}>
                      Admin
                    </Link>
                  )}
                  {profile && (
                    <Link href="/laporan-saya" onClick={() => setMobileNavOpen(false)} className={mobileNavLink('/laporan-saya')}>
                      Laporan Saya
                    </Link>
                  )}
                </nav>

                <div
                  className="border-t border-line px-4 py-3"
                  style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
                >
                  <div className="mb-2 flex items-center gap-2.5 px-1">
                    <div className="flex size-9 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-body">
                      {profile?.initials || '?'}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-semibold leading-tight text-ink">
                        {profile?.name || 'Masuk'}
                      </span>
                      <span className="text-xs leading-tight text-muted">{roleLabel}</span>
                    </div>
                  </div>
                  {profile ? (
                    <>
                      <Link
                        href="/pengaturan"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex min-h-11 items-center gap-2 rounded-control px-3 text-[13px] text-body transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        <Settings className="size-4" /> Pengaturan akun
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
                      >
                        <LogOut className="size-4" /> Keluar
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/masuk"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex min-h-11 items-center rounded-control px-3 text-[13px] text-body transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        Masuk ke akun
                      </Link>
                      <Link
                        href="/daftar"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex min-h-11 items-center rounded-control px-3 text-[13px] text-body transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        Buat akun baru
                      </Link>
                    </>
                  )}
                </div>
              </div>,
              document.body,
            )}
          </>
        )}

        {/* Right Action: Search icon + notification bell + user profile pill */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/cari"
            className="hidden size-11 items-center justify-center rounded-control text-body transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 min-[360px]:inline-flex"
            title={catalogLabel}
            aria-label={catalogLabel}
          >
            <Search className="size-[18px]" />
          </Link>

          {authReady && profile && (
            <NotificationBell />
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-2.5 rounded-pill border border-line bg-surface py-1 pl-1.5 pr-2.5 transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-inverse">
                {profile?.initials || '?'}
              </span>
              <span className="hidden min-w-0 flex-col text-left sm:flex">
                <span className="max-w-[9rem] truncate text-[13px] font-semibold leading-tight text-ink">
                  {profile?.name || 'Masuk'}
                </span>
                <span className="text-xs leading-tight text-muted">{roleLabel}</span>
              </span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-surface border border-line bg-surface p-1.5 shadow-overlay"
              >
                {profile ? (
                  <>
                    <Link
                      href="/pengaturan"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-control px-3 text-[13px] text-body transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <Settings className="size-4" /> Pengaturan akun
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
                    >
                      <LogOut className="size-4" /> Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/masuk"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center rounded-control px-3 text-[13px] text-body transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      Masuk ke akun
                    </Link>
                    <Link
                      href="/daftar"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-11 items-center rounded-control px-3 text-[13px] text-body transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      Buat akun baru
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {!isAuthPage && authReady && (
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="flex size-11 items-center justify-center rounded-control border border-line bg-surface text-body transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-haspopup="dialog"
              aria-controls="mobile-nav"
              aria-label="Buka menu navigasi"
            >
              <Menu className="size-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
