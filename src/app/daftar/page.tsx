'use client';

import { Suspense, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { signUpUser } from '@/lib/supabase/auth';
import { getAuthRedirectPath } from '@/lib/supabase/redirect';
import { getAllowedEmailDomains } from '@/lib/supabase/config';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthShell } from '@/components/AuthShell';
import { TextInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

function getRegistrationError(error: { code?: string; status?: number; name?: string; message?: string }) {
  if (error.name === 'AuthDomainError' || error.message?.includes('email perusahaan') || error.message?.includes('Domain email')) {
    return error.message || 'Gunakan email perusahaan yang diizinkan.';
  }
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.';
  }
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return 'Terlalu banyak percobaan pendaftaran. Tunggu beberapa saat sebelum mencoba lagi.';
  }
  if (error.code === 'weak_password') {
    return 'Password belum memenuhi ketentuan keamanan. Gunakan password yang lebih kuat.';
  }
  if (error.code === 'email_address_invalid') {
    return 'Alamat email belum valid. Periksa kembali email kamu.';
  }
  if (error.code === 'signup_disabled' || error.code === 'email_provider_disabled' || error.code === 'email_address_not_authorized') {
    return 'Pendaftaran belum tersedia untuk email ini. Hubungi admin.';
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || error.code === 'request_timeout' || (error.status && error.status >= 500)) {
    return 'Layanan pendaftaran belum dapat dihubungi. Periksa koneksi internet dan coba lagi nanti.';
  }
  return 'Pendaftaran belum berhasil. Coba lagi nanti atau hubungi admin.';
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getAuthRedirectPath(searchParams.get('next'));
  const loginUrl = searchParams.has('next') ? `/masuk?${new URLSearchParams({ next: nextPath })}` : '/masuk';
  const allowedDomains = getAllowedEmailDomains();
  const domainHint = allowedDomains.length ? allowedDomains.map((d) => `@${d}`).join(', ') : 'domain perusahaan';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const isSubmitting = useRef(false);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting.current || confirmationEmail) return;

    const normalizedEmail = email.trim().toLowerCase();
    let validationError = '';
    if (!name.trim()) validationError = 'Nama lengkap wajib diisi.';
    else if (!normalizedEmail) validationError = 'Email wajib diisi.';
    else if (!z.email().safeParse(normalizedEmail).success) {
      validationError = 'Masukkan alamat email yang valid.';
    } else if (password.length < 8) validationError = 'Password harus berisi minimal 8 karakter.';
    else if (!confirmPassword) validationError = 'Konfirmasi password wajib diisi.';
    else if (password !== confirmPassword) validationError = 'Konfirmasi password belum sama dengan password.';

    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await signUpUser({
        email: normalizedEmail,
        password,
        fullName: name.trim(),
        department: department.trim() || undefined,
        employeeId: employeeId.trim() || undefined,
      });

      if (signUpError) {
        const message = getRegistrationError(signUpError);
        setError(message);
        toast.error(message);
        return;
      }

      if (!data.user) {
        const message = 'Pendaftaran belum dapat dipastikan. Coba masuk atau hubungi admin.';
        setError(message);
        toast.error(message);
        return;
      }

      if (data.user.identities?.length === 0) {
        const message = 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.';
        setError(message);
        toast.error(message);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (data.session) {
        toast.success('Pendaftaran berhasil. Kamu sudah masuk ke akun.');
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setConfirmationEmail(normalizedEmail);
    } catch {
      const message = 'Pendaftaran belum dapat diselesaikan. Periksa koneksi internet dan coba lagi nanti.';
      setError(message);
      toast.error(message);
    } finally {
      isSubmitting.current = false;
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Registrasi karyawan
          </p>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-ink">Buat akun</h1>
          <p className="text-pretty text-[13px] leading-5 text-body">
            Daftar menggunakan email perusahaan ({domainHint}) untuk mengirim laporan dan mengikuti proses klaim.
          </p>
        </div>

        {confirmationEmail ? (
          <div role="status" className="space-y-4 rounded-surface border border-info/20 bg-info-soft p-5 text-[13px] leading-5 text-body">
            <h2 className="text-sm font-semibold text-ink">Cek email kamu</h2>
            <p className="break-words">
              Jika pendaftaran dapat diproses, tautan konfirmasi akan dikirim ke {confirmationEmail}. Periksa kotak masuk dan folder spam, lalu konfirmasi email sebelum masuk.
            </p>
            <Link href={loginUrl} className="btn-primary w-full">
              Lanjut ke halaman masuk
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5" noValidate aria-busy={isLoading} aria-describedby={error ? 'registration-error' : undefined}>
            {error && (
              <div id="registration-error" role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger">
                {error}
              </div>
            )}

            <fieldset disabled={isLoading} className="space-y-5">
              <TextInput
                label="Nama lengkap"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama lengkap"
              />

              <TextInput
                label="Email perusahaan"
                required
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={allowedDomains[0] ? `nama@${allowedDomains[0]}` : 'nama@perusahaan.com'}
              />

              <div className="space-y-1.5">
                <label htmlFor="registration-password" className="block text-[13px] font-semibold text-ink">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="registration-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="form-input form-input-icon-right w-full"
                    placeholder="Minimal 8 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    aria-controls="registration-password"
                    className="absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="registration-confirm-password" className="block text-[13px] font-semibold text-ink">
                  Konfirmasi password
                </label>
                <div className="relative">
                  <input
                    id="registration-confirm-password"
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="form-input form-input-icon-right w-full"
                    placeholder="Ulangi password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                    aria-controls="registration-confirm-password"
                    className="absolute right-0 top-0 inline-flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  >
                    {showConfirmPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <details className="group rounded-surface border border-line bg-surface-muted px-4">
                <summary className="flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 text-[13px] font-medium text-body">
                  <span>Data karyawan (opsional)</span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="grid grid-cols-1 gap-5 pb-4 pt-1 sm:grid-cols-2">
                  <TextInput
                    label="Departemen/Divisi (opsional)"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="Contoh: Operasional"
                  />
                  <TextInput
                    label="ID Karyawan (opsional)"
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    placeholder="Nomor/ID karyawan"
                  />
                </div>
              </details>

              <Button type="submit" size="lg" loading={isLoading} disabled={isLoading} className="w-full">
                <span>{isLoading ? 'Mendaftarkan akun...' : 'Buat Akun'}</span>
                {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </fieldset>
          </form>
        )}

        <p className="border-t border-line pt-5 text-center text-[13px] text-body">
          Sudah punya akun?{' '}
          <Link href={loginUrl} className="font-semibold text-accent transition-colors hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            Masuk di sini
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-center text-sm text-muted">Memuat halaman daftar...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
