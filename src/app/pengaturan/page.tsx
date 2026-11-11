'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
import { validateIndonesianPhone, sanitizePhoneInput, validateFullName, validateID } from '@/lib/validation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/Field';

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/masuk');
        return;
      }

      setEmail(user.email || '');
      setName(user.user_metadata?.full_name || '');
      const supabase = createClient();
      const { data: profile } = await supabase.from('profiles').select('full_name, phone, department, employee_id').eq('id', user.id).maybeSingle();
      if (profile) {
        setName(profile.full_name || '');
        setPhone(profile.phone || '');
        setEmployeeId(profile.employee_id || '');
        setDepartment(profile.department || '');
      }
    };

    loadProfile();
  }, [router]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setMessage('');
    setError('');

    const nameCheck = validateFullName(name);
    if (!nameCheck.isValid) {
      const err = nameCheck.error || 'Nama lengkap belum valid.';
      setError(err);
      toast.error(err);
      return;
    }

    const phoneCheck = validateIndonesianPhone(phone, { required: false });
    if (!phoneCheck.isValid) {
      const err = phoneCheck.error || 'Nomor telepon tidak valid.';
      setError(err);
      toast.error(err);
      return;
    }

    const idCheck = validateID(employeeId);
    if (!idCheck.isValid) {
      const err = idCheck.error || 'ID karyawan tidak valid.';
      setError(err);
      toast.error(err);
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      router.replace('/masuk');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      const profileData = {
        full_name: name.trim(),
        employee_id: employeeId.trim() || null,
        department: department.trim() || null,
        phone: phoneCheck.normalized || null,
      };
      const [{ error: profileError }, { error: authError }] = await Promise.all([
        supabase.from('profiles').upsert({ id: user.id, ...profileData }, { onConflict: 'id' }),
        supabase.auth.updateUser({ data: { full_name: name.trim(), department: department.trim() || null, employee_id: employeeId.trim() || null } }),
      ]);

      if (profileError || authError) {
        setError('Profil belum dapat disimpan. Coba lagi nanti.');
        toast.error('Profil belum dapat disimpan. Coba lagi nanti.');
        return;
      }

      setMessage('Pengaturan akun berhasil disimpan.');
      toast.success('Pengaturan akun berhasil disimpan.');
    } catch {
      setError('Terjadi kendala saat menyimpan. Coba lagi nanti.');
      toast.error('Terjadi kendala saat menyimpan. Coba lagi nanti.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Akun"
        title="Pengaturan akun"
        description="Perbarui informasi profil dan kontak karyawan."
      />

      <div className="rounded-card border border-line bg-surface p-5 sm:p-8">
        {error && (
          <div role="alert" className="mb-4 rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="mb-4 rounded-control border border-success/20 bg-success-soft px-3 py-2.5 text-[13px] leading-5 text-success">
            {message}
          </div>
        )}

        <form onSubmit={saveProfile} className="space-y-5">
          <TextInput
            label="Nama lengkap"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <TextInput
            label="Email"
            value={email}
            disabled
            className="bg-surface-muted text-muted"
          />

          <TextInput
            label="Nomor telepon / WhatsApp"
            type="tel"
            maxLength={16}
            value={phone}
            onChange={(event) => setPhone(sanitizePhoneInput(event.target.value))}
            placeholder="Contoh: 081234567890"
            hint="Awalan 08 atau 628 dengan 10–15 digit agar dapat dihubungi via WhatsApp."
          />

          <p className="text-pretty text-[13px] leading-5 text-body">
            Data karyawan bersifat opsional. Kamu bisa menambahkan atau menghapusnya kapan saja.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextInput
              label="ID Karyawan (opsional)"
              maxLength={20}
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              placeholder="Contoh: EMP-00123"
              hint="7–20 karakter alfanumerik."
            />
            <TextInput
              label="Departemen/Divisi (opsional)"
              maxLength={100}
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Contoh: Operasional"
            />
          </div>

          <div className="border-t border-line pt-5">
            <Button type="submit" loading={isSaving} disabled={isSaving}>
              {!isSaving && <Save className="size-4" aria-hidden="true" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
