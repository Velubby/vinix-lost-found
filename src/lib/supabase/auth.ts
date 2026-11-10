import { createClient } from '@/lib/supabase/client';
import { getAllowedEmailDomains, isAllowedCompanyEmail } from '@/lib/supabase/config';

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_number?: string | null;
  // Legacy fields kept optional for migration compatibility (Step 3 will adapt schema).
  student_number?: string | null;
  faculty?: string | null;
  study_program?: string | null;
  department?: string | null;
  employee_id?: string | null;
  role?: string | null;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile(userId?: string): Promise<UserProfile | null> {
  const supabase = createClient();
  let targetId = userId;

  if (!targetId) {
    const user = await getCurrentUser();
    if (!user) return null;
    targetId = user.id;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    phone_number: data.phone ?? null,
  } as UserProfile;
}

export function validateCompanyEmail(email: string): { ok: boolean; message?: string } {
  const domains = getAllowedEmailDomains();
  if (domains.length === 0) {
    return {
      ok: false,
      message:
        'Domain email perusahaan belum dikonfigurasi. Hubungi admin untuk mengatur NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS.',
    };
  }
  if (!isAllowedCompanyEmail(email)) {
    const list = domains.map((d) => `@${d}`).join(', ');
    return {
      ok: false,
      message: `Gunakan email perusahaan yang diizinkan (${list}).`,
    };
  }
  return { ok: true };
}

export async function signInUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domainCheck = validateCompanyEmail(normalizedEmail);
  if (!domainCheck.ok) {
    return { data: { user: null, session: null }, error: { message: domainCheck.message, name: 'AuthDomainError' } as any };
  }
  const supabase = createClient();
  return await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
}

export async function signUpUser(data: {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  department?: string;
  employeeId?: string;
}) {
  const normalizedEmail = data.email.trim().toLowerCase();
  const domainCheck = validateCompanyEmail(normalizedEmail);
  if (!domainCheck.ok) {
    return { data: { user: null, session: null }, error: { message: domainCheck.message, name: 'AuthDomainError' } as any };
  }
  const supabase = createClient();
  return await supabase.auth.signUp({
    email: normalizedEmail,
    password: data.password,
    options: {
      data: {
        full_name: data.fullName,
        phone_number: data.phoneNumber || null,
        department: data.department || null,
        employee_id: data.employeeId || null,
      },
    },
  });
}

export async function signOutUser() {
  const supabase = createClient();
  return await supabase.auth.signOut();
}

export async function updateUserProfile(profile: {
  full_name?: string;
  phone?: string;
  phone_number?: string;
  department?: string;
  employee_id?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Pengguna belum masuk');

  const supabase = createClient();
  const phoneVal = profile.phone ?? profile.phone_number;
  const updateData: Record<string, string | null> = {};
  if (profile.full_name !== undefined) updateData.full_name = profile.full_name;
  if (phoneVal !== undefined) updateData.phone = phoneVal;
  if (profile.department !== undefined) updateData.department = profile.department;
  if (profile.employee_id !== undefined) updateData.employee_id = profile.employee_id;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) throw error;
  return true;
}

export async function checkIsStaff(userId?: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role?.toLowerCase() === 'admin';
}
