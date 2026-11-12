'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { signInUser } from '@/lib/supabase/auth';
import { getAuthRedirectPath } from '@/lib/supabase/redirect';
import { getAllowedEmailDomains } from '@/lib/supabase/config';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthShell } from '@/components/AuthShell';
import { TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getAuthRedirectPath(searchParams.get('next'));
  const registerUrl = searchParams.has('next') ? `/daftar?${new URLSearchParams({ next: nextPath })}` : '/daftar';
  const allowedDomains = getAllowedEmailDomains();
  const domainHint = allowedDomains.length ? allowedDomains.map((d) => `@${d}`).join(', ') : 'domain perusahaan';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    const normalizedEmail = email.trim().toLowerCase();
    let validationError = '';
    if (!normalizedEmail) validationError = 'Email wajib diisi.';
    else if (!z.email().safeParse(normalizedEmail).success) validationError = 'Masukkan alamat email yang valid.';
    else if (!password) validationError = 'Password wajib diisi.';
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const { error: signInError } = await signInUser(normalizedEmail, password);
      if (signInError) {
        const message = signInError.message?.includes('email perusahaan') || signInError.message?.includes('Domain email')
          ? signInError.message
          : 'Email atau password belum sesuai, atau akun belum terdaftar.';
        setError(message);
        toast.error(message);
        return;
      }

      toast.success('Berhasil masuk ke akun');
      router.replace(nextPath);
      router.refresh();
    } catch {
      const message = 'Login belum dapat diselesaikan. Periksa koneksi internet dan coba lagi.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-ink">
            Masuk akun karyawan
          </h1>
          <p className="text-pretty text-[13px] leading-5 text-body">
            Gunakan email perusahaan ({domainHint}) untuk masuk.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          {error && (
            <div role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger">
              {error}
            </div>
          )}

          <TextInput
            id="email"
            label="Email perusahaan"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={allowedDomains[0] ? `nama@${allowedDomains[0]}` : 'nama@perusahaan.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <label htmlFor="password" className="block text-[13px] font-semibold text-ink">
                Password
              </label>
              <Link
                href="/bantuan#faq"
                className="text-xs font-medium text-accent transition-colors hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input form-input-icon-right w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                aria-controls="password"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <label className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-[13px] text-body">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 rounded border-line-strong accent-accent"
            />
            <span>Ingat saya di perangkat ini</span>
          </label>

          <Button type="submit" size="lg" loading={isLoading} disabled={isLoading} className="w-full">
            <span>{isLoading ? 'Memeriksa kredensial...' : 'Masuk ke akun'}</span>
            {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
          </Button>
        </form>

        <p className="border-t border-line pt-5 text-center text-[13px] text-body">
          Belum punya akun?{' '}
          <Link href={registerUrl} className="font-semibold text-accent transition-colors hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            Buat akun baru
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-center text-sm text-muted">Memuat halaman masuk...</div>}>
      <LoginContent />
    </Suspense>
  );
}
