/**
 * Shared form validation utilities for Vinix Lost & Found
 */

/**
 * Validates Indonesian phone numbers (WhatsApp / Telp).
 * Rules:
 * - Must start with 08, 628, or +628
 * - Digits only (optional leading +)
 * - Total digit length: between 10 and 15 digits
 */
export function validateIndonesianPhone(
  phone: string,
  options: { required?: boolean } = { required: true }
): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  const clean = phone.trim();
  if (!clean) {
    if (options.required) {
      return { isValid: false, error: 'Nomor WhatsApp / telepon wajib diisi.' };
    }
    return { isValid: true, normalized: '' };
  }

  // Remove spaces and dashes for checking
  const compact = clean.replace(/[\s-]/g, '');

  if (!/^\+?[0-9]+$/.test(compact)) {
    return { isValid: false, error: 'Nomor telepon hanya boleh berisi angka.' };
  }

  const digits = compact.startsWith('+') ? compact.slice(1) : compact;

  if (digits.length < 10) {
    return { isValid: false, error: 'Nomor telepon terlalu pendek (minimal 10 digit).' };
  }

  if (digits.length > 15) {
    return { isValid: false, error: 'Nomor telepon terlalu panjang (maksimal 15 digit).' };
  }

  // Check prefix: 08..., 628..., or +628...
  if (!/^(08|628|\+628)/.test(compact)) {
    return {
      isValid: false,
      error: 'Nomor telepon harus diawali dengan 08 atau 628 (contoh: 081234567890).',
    };
  }

  return {
    isValid: true,
    normalized: compact.startsWith('+') ? compact : compact.startsWith('62') ? `+${compact}` : compact,
  };
}

/**
 * Sanitizes phone input in real-time as user types.
 * Allows only digits and leading plus.
 */
export function sanitizePhoneInput(value: string): string {
  if (value.startsWith('+')) {
    return '+' + value.slice(1).replace(/[^0-9]/g, '');
  }
  return value.replace(/[^0-9]/g, '');
}

/**
 * Validates full name.
 */
export function validateFullName(name: string): { isValid: boolean; error?: string } {
  const clean = name.trim();
  if (!clean) {
    return { isValid: false, error: 'Nama lengkap wajib diisi.' };
  }
  if (clean.length < 2) {
    return { isValid: false, error: 'Nama lengkap minimal 2 karakter.' };
  }
  if (clean.length > 100) {
    return { isValid: false, error: 'Nama lengkap maksimal 100 karakter.' };
  }
  return { isValid: true };
}

/**
 * Validates email format.
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const clean = email.trim();
  if (!clean) {
    return { isValid: false, error: 'Email wajib diisi.' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clean)) {
    return { isValid: false, error: 'Format email tidak valid (contoh: nama@perusahaan.com).' };
  }
  return { isValid: true };
}

/**
 * Validates ID (Nomor Induk karyawan).
 * If provided, must consist of 7-20 alphanumeric characters (digits standard).
 */
export function validateID(nim: string): { isValid: boolean; error?: string } {
  const clean = nim.trim();
  if (!clean) return { isValid: true };

  const compact = clean.replace(/[\s-]/g, '');
  if (!/^[a-zA-Z0-9]{7,20}$/.test(compact)) {
    return { isValid: false, error: 'ID harus berupa 7–20 karakter alfanumerik.' };
  }
  return { isValid: true };
}

/**
 * Validates claim secret ownership description (Ciri Khusus).
 * Must be at least 10 characters long to provide meaningful verification evidence.
 */
export function validateCiriKhusus(text: string): { isValid: boolean; error?: string } {
  const clean = text.trim();
  if (!clean) {
    return { isValid: false, error: 'Ciri khusus wajib diisi.' };
  }
  if (clean.length < 10) {
    return {
      isValid: false,
      error: 'Jelaskan ciri khusus minimal 10 karakter agar petugas dapat mencocokkannya.',
    };
  }
  if (clean.length > 500) {
    return {
      isValid: false,
      error: 'Ciri khusus maksimal 500 karakter.',
    };
  }
  return { isValid: true };
}
