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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 overflow-hidden">
              <Image
                src="/logo.svg"
                alt="Vinix Lost & Found Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[1.05rem] text-[#123356] tracking-tight leading-none">
                Vinix L&amp;F
              </span>
              <span className="hidden sm:block text-[0.6875rem] font-medium text-slate-500 tracking-wider uppercase mt-0.5">
                Portal Resmi
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        {!isAuthPage && authReady && (
          <>
            {/* Desktop: horizontal pill nav */}
            <nav aria-label="Navigasi Utama" className="hidden md:flex items-center gap-1 bg-black/4 p-1 rounded-xl border border-black/5">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-[0.875rem] font-medium transition-all ${
                  isCurrent('/') && pathname === '/'
                    ? 'bg-white text-[#123356] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-[0.875rem] font-medium transition-all ${
                  isCurrent('/dashboard')
                    ? 'bg-white text-[#123356] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/cari"
                className={`px-3 py-1.5 rounded-lg text-[0.875rem] font-medium transition-all ${
                  isCurrent('/cari')
                    ? 'bg-white text-[#123356] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {(profile?.role?.toLowerCase() === 'admin') ? 'List Barang' : 'Cari Barang'}
              </Link>
              {profile && <Link
                href="/lapor"
                className={`px-3 py-1.5 rounded-lg text-[0.875rem] font-medium transition-all ${
                  isCurrent('/lapor')
                    ? 'bg-white text-[#123356] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Lapor Barang
              </Link>}

              {profile && (profile.role?.toLowerCase() === 'admin') && <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg text-[0.875rem] font-medium transition-all ${
                  isCurrent('/admin')
                    ? 'bg-white text-[#123356] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Admin
              </Link>}
              {profile && <Link
                href="/laporan-saya"
                className={`px-3 py-1.5 rounded-lg text-[0.875rem] font-medium transition-all ${
                  isCurrent('/laporan-saya')
                    ? 'bg-white text-[#123356] shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Laporan Saya
              </Link>}
            </nav>

            {/* Mobile menu overlay is portaled to the body below */}
            {mounted && mobileNavOpen && createPortal(
              <div
                id="mobile-nav"
                role="dialog"
                aria-modal="true"
                aria-label="Menu navigasi"
                className="md:hidden fixed inset-0 z-[60] flex flex-col bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
                  <span className="font-bold text-[#123356] tracking-tight">Vinix L&amp;F</span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center justify-center w-10 h-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                    aria-label="Tutup menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <nav aria-label="Navigasi Seluler" className="flex-1 px-4 py-4 space-y-1 overflow-y-auto max-h-[calc(100dvh-100px)] [&>a]:min-h-11 [&>a]:flex [&>a]:items-center">
                  <Link
                    href="/"
                    onClick={() => setMobileNavOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isCurrent('/') && pathname === '/' ? 'bg-[#123356]/10 text-[#123356] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    Beranda
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileNavOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isCurrent('/dashboard') ? 'bg-[#123356]/10 text-[#123356] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/cari"
                    onClick={() => setMobileNavOpen(false)}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isCurrent('/cari') ? 'bg-[#123356]/10 text-[#123356] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                  >
                    {(profile?.role?.toLowerCase() === 'admin') ? 'List Barang' : 'Cari Barang'}
                  </Link>
                  {profile && (
                    <Link
                      href="/lapor"
                      onClick={() => setMobileNavOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isCurrent('/lapor') ? 'bg-[#123356]/10 text-[#123356] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      Lapor Barang
                    </Link>
                  )}
                  {profile && (profile.role?.toLowerCase() === 'admin') && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileNavOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isCurrent('/admin') ? 'bg-[#123356]/10 text-[#123356] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      Admin
                    </Link>
                  )}
                  {profile && (
                    <Link
                      href="/laporan-saya"
                      onClick={() => setMobileNavOpen(false)}
                      className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isCurrent('/laporan-saya') ? 'bg-[#123356]/10 text-[#123356] font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      Laporan Saya
                    </Link>
                  )}
                </nav>
                <div className="px-4 py-3 border-t border-slate-100" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {profile?.initials || '?'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 leading-tight">{profile?.name || 'Masuk'}</span>
                      <span className="text-[10px] text-slate-500 leading-none">{profile ? ((profile.role?.toLowerCase() === 'admin') ? 'Admin' : 'Karyawan') : 'Akun pengguna'}</span>
                    </div>
                  </div>
                  {profile ? (
                    <>
                      <Link href="/pengaturan" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Settings className="w-4 h-4" /> Pengaturan akun</Link>
                      <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 min-h-11 text-left text-xs text-rose-700 hover:bg-rose-50"><LogOut className="w-4 h-4" /> Keluar</button>
                    </>
                  ) : (
                    <>
                      <Link href="/masuk" onClick={() => setMobileNavOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Masuk ke akun</Link>
                      <Link href="/daftar" onClick={() => setMobileNavOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Buat akun baru</Link>
                    </>
                  )}
                </div>
              </div>,
              document.body,
            )}
          </>
        )}

        {/* Right Action: Search icon + notification bell + user profile pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/cari"
            className="hidden min-[360px]:inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-black/6 text-slate-500 transition-all"
            title={(profile?.role?.toLowerCase() === 'admin') ? 'List Barang' : 'Cari Barang'}
            aria-label={(profile?.role?.toLowerCase() === 'admin') ? 'List Barang' : 'Cari Barang'}
          >
            <Search className="w-4.5 h-4.5" />
          </Link>

          {authReady && profile && (
            <NotificationBell />
          )}

          <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2.5 p-1 pl-2.5 pr-3 rounded-full bg-white border border-slate-200/80 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
              {profile?.initials || '?'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">{profile?.name || 'Masuk'}</span>
              <span className="text-[10px] text-slate-500 leading-none">{profile ? ((profile.role?.toLowerCase() === 'admin') ? 'Admin' : 'Karyawan') : 'Akun pengguna'}</span>
            </div>
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              {profile ? (
                <>
                  <Link href="/pengaturan" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"><Settings className="w-4 h-4" /> Pengaturan akun</Link>
                  <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-700 hover:bg-rose-50"><LogOut className="w-4 h-4" /> Keluar</button>
                </>
              ) : (
                <>
                  <Link href="/masuk" role="menuitem" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Masuk ke akun</Link>
                  <Link href="/daftar" role="menuitem" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Buat akun baru</Link>
                </>
              )}
            </div>
          )}
          </div>

          {!isAuthPage && authReady && (
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="md:hidden flex items-center gap-1.5 h-10 pl-2 pr-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              aria-expanded={mobileNavOpen}
              aria-haspopup="dialog"
              aria-controls="mobile-nav"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[11px] font-semibold">Menu</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
