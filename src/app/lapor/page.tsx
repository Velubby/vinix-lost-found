'use client';

import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Upload, Camera, CheckCircle2, ArrowRight, ArrowLeft, Copy, CheckCheck, X } from 'lucide-react';
import { OFFICE_LOCATIONS } from '@/lib/locations';
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { optimizeImageFile } from '@/lib/image';
import { validateIndonesianPhone, sanitizePhoneInput, validateFullName, validateEmail } from '@/lib/validation';

function getJakartaDateTime(timestamp = Date.now()) {
  const value = new Date(timestamp + 7 * 60 * 60 * 1000).toISOString();
  return { tanggal: value.slice(0, 10), waktu: value.slice(11, 16) };
}

function getIncidentDateTimeError(date: string, time: string, now = Date.now()) {
  if (!date || !time) return 'Harap isi tanggal dan waktu kejadian terlebih dahulu.';

  const timestamp = new Date(`${date}T${time}:00+07:00`).getTime();
  const jakartaOffset = 7 * 60 * 60 * 1000;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time) ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp + jakartaOffset).toISOString().slice(0, 16) !== `${date}T${time}`
  ) {
    return 'Tanggal atau waktu kejadian tidak valid.';
  }

  if (timestamp > now) return 'Tanggal dan waktu kejadian tidak boleh melebihi waktu pelaporan (WIB).';
  return '';
}

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

type SelectedPhoto = {
  id: string;
  file: File;
  preview: string;
};

function ReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryType =
    searchParams.get('type') === 'temuan'
      ? 'temuan'
      : searchParams.get('type') === 'hilang'
      ? 'hilang'
      : null;

  const [selectedType, setSelectedType] = useState<'hilang' | 'temuan'>('hilang');
  const reportType = queryType || selectedType;

  const handleSwitchType = (type: 'hilang' | 'temuan') => {
    setSelectedType(type);
    router.replace(`/lapor?type=${type}`, { scroll: false });
  };
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedReportCode, setSubmittedReportCode] = useState('');
  const [submittedReportId, setSubmittedReportId] = useState('');
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [dateTimeError, setDateTimeError] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { tanggal: today, waktu: currentJakartaTime } = getJakartaDateTime(currentTime);
  const predefinedCategories = ['Elektronik', 'Dokumen', 'Aksesoris', 'Tas & Pakaian', 'Lainnya'];

  const toJakartaIso = (date: string, time: string) =>
    new Date(`${date}T${time}:00+07:00`).toISOString();

  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [formData, setFormData] = useState(() => ({
    namaBarang: '',
    kategori: 'Elektronik',
    lokasi: '',
    ...getJakartaDateTime(),
    deskripsiPublik: '',
    ciriRahasia: '',
    namaPelapor: '',
    email: '',
    telepon: '',
    setuju: true
  }));

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Dialog ini portal ke document.body, jadi tetap terlihat saat Activity
  // menyembunyikan halaman. Tutup dulu sebelum halaman ditinggalkan.
  useLayoutEffect(() => {
    return () => {
      setIsSuccess(false);
      setIsCopied(false);
    };
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/masuk?next=/lapor');
        setAuthChecked(true);
        return;
      }
      setFormData((current) => ({
        ...current,
        namaPelapor: user.user_metadata?.full_name || current.namaPelapor,
        email: user.email || current.email,
      }));
      createClient().from('profiles').select('phone').eq('id', user.id).maybeSingle().then(({ data: profile }) => {
        setFormData((current) => ({ ...current, telepon: profile?.phone || '' }));
        setAuthChecked(true);
      });
    });
  }, [router]);

  if (!authChecked) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">Memeriksa sesi akun...</div>;
  }

  const validateIncidentDateTime = () => {
    const error = getIncidentDateTimeError(formData.tanggal, formData.waktu);
    setDateTimeError(error);
    if (error) {
      setCurrentStep(1);
      toast.error(error);
      return false;
    }
    return true;
  };

  const addPhotos = (files: File[]) => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto per laporan.`);
      return;
    }

    const accepted: SelectedPhoto[] = [];
    for (const file of files.slice(0, remaining)) {
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`${file.name} melebihi 5MB dan tidak ditambahkan.`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }

    if (files.length > remaining) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto per laporan.`);
    }
    if (accepted.length === 0) return;

    setSubmitError('');
    setPhotos((current) => [...current, ...accepted]);
  };

  const removePhoto = (id: string) => {
    const target = photos.find((photo) => photo.id === id);
    if (target) URL.revokeObjectURL(target.preview);
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  };

  const clearPhotos = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
    setPhotos([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.namaBarang.trim()) {
      toast.error('Nama barang wajib diisi.');
      setCurrentStep(1);
      return;
    }

    if (formData.namaBarang.trim().length < 3) {
      toast.error('Nama barang terlalu singkat (minimal 3 karakter).');
      setCurrentStep(1);
      return;
    }

    if (!formData.lokasi.trim()) {
      toast.error('Lokasi kejadian wajib diisi.');
      setCurrentStep(1);
      return;
    }

    if (formData.lokasi.trim().length < 3) {
      toast.error('Lokasi kejadian terlalu singkat (minimal 3 karakter).');
      setCurrentStep(1);
      return;
    }

    if (!validateIncidentDateTime()) return;

    if (!formData.deskripsiPublik.trim()) {
      toast.error('Deskripsi publik wajib diisi.');
      setCurrentStep(2);
      return;
    }

    if (formData.deskripsiPublik.trim().length < 10) {
      toast.error('Deskripsi publik minimal 10 karakter agar mudah dikenali.');
      setCurrentStep(2);
      return;
    }

    const nameCheck = validateFullName(formData.namaPelapor);
    if (!nameCheck.isValid) {
      const err = nameCheck.error || 'Nama pelapor belum valid.';
      toast.error(err);
      setSubmitError(err);
      setCurrentStep(3);
      return;
    }

    const emailCheck = validateEmail(formData.email);
    if (!emailCheck.isValid) {
      const err = emailCheck.error || 'Email belum valid.';
      toast.error(err);
      setSubmitError(err);
      setCurrentStep(3);
      return;
    }

    const phoneCheck = validateIndonesianPhone(formData.telepon);
    if (!phoneCheck.isValid) {
      const err = phoneCheck.error || 'Nomor telepon belum valid.';
      toast.error(err);
      setSubmitError(err);
      setCurrentStep(3);
      return;
    }

    if (!formData.setuju) {
      toast.error('Harap setujui pernyataan sebelum mengirim laporan.');
      return;
    }

    const reportCode = `LNF-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setSubmitError('Silakan masuk terlebih dahulu sebelum mengirim laporan.');
      toast.error('Silakan masuk terlebih dahulu sebelum mengirim laporan.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      let imageUrl: string | null = null;
      const imageUrls: string[] = [];
      for (const photo of photos) {
        const uploadFile = await optimizeImageFile(photo.file, { blur: reportType === 'temuan' });
        const extension = uploadFile.type === 'image/webp' ? 'webp' : photo.file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('item-images').upload(imagePath, uploadFile, { contentType: uploadFile.type, upsert: false });
        if (uploadError) {
          setSubmitError('Foto belum dapat diunggah. Pastikan bucket item-images sudah dibuat.');
          toast.error('Foto belum dapat diunggah. Pastikan bucket item-images sudah dibuat.');
          return;
        }
        const publicUrl = supabase.storage.from('item-images').getPublicUrl(imagePath).data.publicUrl;
        imageUrls.push(publicUrl);
        if (!imageUrl) imageUrl = publicUrl;
      }

      const { data: savedReport, error } = await supabase.from('reports').insert({
        report_code: reportCode,
        user_id: user.id,
        type: reportType,
        item_title: formData.namaBarang.trim(),
        category: formData.kategori.trim(),
        location: formData.lokasi.trim(),
        incident_at: toJakartaIso(formData.tanggal, formData.waktu),
        public_description: formData.deskripsiPublik.trim(),
        private_description: formData.ciriRahasia.trim(),
        image_url: imageUrl,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        contact_phone: phoneCheck.normalized || formData.telepon.trim(),
      }).select('id').single();

      if (error || !savedReport) {
        setSubmitError('Laporan belum dapat disimpan. Periksa koneksi lalu coba lagi.');
        toast.error('Laporan belum dapat disimpan. Periksa koneksi lalu coba lagi.');
        return;
      }

      setSubmittedReportId(savedReport.id);
      setSubmittedReportCode(reportCode);
      setSubmitError('');
      setIsSuccess(true);
      toast.success('Laporan berhasil dikirim! Jika ini laporan temuan, silakan serahkan barang ke pos/penyimpanan sesuai arahan petugas untuk verifikasi.');
      setFormData((prev) => ({
        ...prev,
        namaBarang: '',
        lokasi: '',
        ...getJakartaDateTime(),
        deskripsiPublik: '',
        ciriRahasia: '',
        setuju: true
      }));
      clearPhotos();
      setCurrentStep(1);
    } catch {
      setSubmitError('Terjadi kesalahan saat menyimpan laporan. Coba lagi nanti.');
      toast.error('Terjadi kesalahan saat menyimpan laporan. Coba lagi nanti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessNavigate = (href: string) => {
    setIsSuccess(false);
    router.push(href);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-sky-700 uppercase tracking-widest block">
          Formulir Terpadu
        </span>
        <h1 className="text-3xl font-extrabold text-[#123356]">
          {reportType === 'hilang' ? 'Laporkan Barang Hilang' : 'Laporkan Barang Temuan'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Isi detail informasi barang. Petugas akan memverifikasi dan mencocokkan data di sistem.
        </p>
      </div>

      {/* Type switcher */}
      <div className="flex justify-center">
        <div className="segmented-control p-1 bg-slate-200/70 rounded-2xl">
          <button
            type="button"
            onClick={() => handleSwitchType('hilang')}
            className={`segmented-control-btn px-4 sm:px-6 py-2 ${reportType === 'hilang' ? 'active' : ''}`}
          >
            Barang Hilang
          </button>
          <button
            type="button"
            onClick={() => handleSwitchType('temuan')}
            className={`segmented-control-btn px-4 sm:px-6 py-2 ${reportType === 'temuan' ? 'active' : ''}`}
          >
            Barang Ditemukan
          </button>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-semibold text-slate-500">
        <span className={`px-2 sm:px-3 py-1 rounded-full ${currentStep === 1 ? 'bg-[#123356] text-white' : 'bg-slate-200'}`}>
          1. Detail Barang
        </span>
        <span className="text-slate-300">→</span>
        <span className={`px-2 sm:px-3 py-1 rounded-full ${currentStep === 2 ? 'bg-[#123356] text-white' : 'bg-slate-200'}`}>
          2. Ciri Spesifik
        </span>
        <span className="text-slate-300">→</span>
        <span className={`px-2 sm:px-3 py-1 rounded-full ${currentStep === 3 ? 'bg-[#123356] text-white' : 'bg-slate-200'}`}>
          3. Konfirmasi
        </span>
      </div>

      {/* Main Card Form */}
      <div className="apple-card p-6 sm:p-8 bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {submitError}
            </div>
          )}

            {/* Step 1: Detail Barang */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-[#123356]">Informasi Dasar Barang</h2>
                  <p className="text-xs text-slate-500">Tentukan nama dan lokasi kejadian sejelas mungkin.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nama Barang</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dompet Kulit Cokelat, Kunci Motor Honda..."
                    value={formData.namaBarang}
                    onChange={(e) => setFormData({ ...formData, namaBarang: e.target.value })}
                       className="form-input w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Kategori</label>
                    <select
                      value={predefinedCategories.includes(formData.kategori) ? formData.kategori : '__custom__'}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value === '__custom__' ? '' : e.target.value })}
                      className="form-input w-full"
                    >
                      <option>Elektronik</option>
                      <option>Dokumen</option>
                      <option>Aksesoris</option>
                      <option>Tas & Pakaian</option>
                      <option>Lainnya</option>
                      <option value="__custom__">Isi sendiri</option>
                    </select>
                    {!predefinedCategories.includes(formData.kategori) && (
                      <input
                        type="text"
                        required
                        value={formData.kategori}
                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                        className="form-input w-full mt-2"
                        placeholder="Tulis kategori barang"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Lokasi Kejadian</label>
                    <select
                      value={useCustomLocation ? '__custom__' : (OFFICE_LOCATIONS.includes(formData.lokasi) ? formData.lokasi : '')}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setUseCustomLocation(true);
                          setFormData({ ...formData, lokasi: '' });
                        } else {
                          setUseCustomLocation(false);
                          setFormData({ ...formData, lokasi: e.target.value });
                        }
                      }}
                      className="form-input w-full"
                      required
                    >
                      <option value="">Pilih lokasi...</option>
                      {OFFICE_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="__custom__">Lainnya (tulis sendiri)</option>
                    </select>
                    {useCustomLocation && (
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Lobi Utama VINIX7, Ruang Training 2..."
                        value={formData.lokasi}
                        onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                        className="form-input w-full mt-2"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="incident-date" className="text-xs font-bold text-slate-700 block">Tanggal Kejadian</label>
                    <input
                      id="incident-date"
                      type="date"
                      required
                      max={today}
                      value={formData.tanggal}
                      aria-invalid={Boolean(dateTimeError)}
                      aria-describedby={dateTimeError ? 'incident-date-time-error' : undefined}
                      onFocus={() => setCurrentTime(Date.now())}
                      onChange={(e) => {
                        setDateTimeError('');
                        setFormData({ ...formData, tanggal: e.target.value });
                      }}
                      className="form-input w-full"
                    />
                  </div>

                  <fieldset className="space-y-1 min-w-0">
                    <legend className="text-xs font-bold text-slate-700">Jam Kejadian</legend>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Jam kejadian"
                        required
                        value={formData.waktu.split(':')[0]}
                        aria-invalid={Boolean(dateTimeError)}
                        aria-describedby={dateTimeError ? 'incident-date-time-error' : undefined}
                        onFocus={() => setCurrentTime(Date.now())}
                        onChange={(e) => {
                          setDateTimeError('');
                          setFormData({ ...formData, waktu: `${e.target.value}:${formData.waktu.split(':')[1]}` });
                        }}
                        className="form-input w-full min-w-0"
                      >
                        {Array.from({ length: 24 }, (_, hour) => {
                          const value = String(hour).padStart(2, '0');
                          return (
                            <option key={value} value={value} disabled={formData.tanggal === today && value > currentJakartaTime.slice(0, 2)}>
                              {value}
                            </option>
                          );
                        })}
                      </select>
                      <span aria-hidden="true">:</span>
                      <select
                        aria-label="Menit kejadian"
                        required
                        value={formData.waktu.split(':')[1]}
                        aria-invalid={Boolean(dateTimeError)}
                        aria-describedby={dateTimeError ? 'incident-date-time-error' : undefined}
                        onFocus={() => setCurrentTime(Date.now())}
                        onChange={(e) => {
                          setDateTimeError('');
                          setFormData({ ...formData, waktu: `${formData.waktu.split(':')[0]}:${e.target.value}` });
                        }}
                        className="form-input w-full min-w-0"
                      >
                        {Array.from({ length: 60 }, (_, minute) => {
                          const value = String(minute).padStart(2, '0');
                          return (
                            <option key={value} value={value} disabled={formData.tanggal === today && formData.waktu.slice(0, 2) === currentJakartaTime.slice(0, 2) && value > currentJakartaTime.slice(3, 5)}>
                              {value}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </fieldset>
                </div>

                {dateTimeError && (
                  <p id="incident-date-time-error" role="alert" className="text-xs text-red-600">
                    {dateTimeError}
                  </p>
                )}

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.namaBarang.trim()) {
                        toast.error('Harap isi nama barang terlebih dahulu.');
                        return;
                      }
                      if (formData.namaBarang.trim().length < 3) {
                        toast.error('Nama barang terlalu singkat (minimal 3 karakter).');
                        return;
                      }
                      if (!formData.lokasi.trim()) {
                        toast.error('Harap isi lokasi kejadian terlebih dahulu.');
                        return;
                      }
                      if (formData.lokasi.trim().length < 3) {
                        toast.error('Lokasi kejadian terlalu singkat (minimal 3 karakter).');
                        return;
                      }
                      if (!validateIncidentDateTime()) return;
                      setCurrentStep(2);
                    }}
                    className="btn-primary text-xs"
                  >
                    <span>Lanjut ke Ciri Spesifik</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Ciri Spesifik & Rahasia */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-[#123356]">Deskripsi &amp; Ciri Khusus</h2>
                  <p className="text-xs text-slate-500">Ciri privat digunakan untuk memverifikasi pemilik sah.</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Deskripsi Publik (Bisa dibaca umum)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {formData.deskripsiPublik.length}/1000 (min. 10)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    maxLength={1000}
                    placeholder="Sebutkan warna utama, bentuk, dan kondisi luar yang wajar diketahui umum..."
                    value={formData.deskripsiPublik}
                    onChange={(e) => setFormData({ ...formData, deskripsiPublik: e.target.value })}
                    className="form-input w-full"
                  />
                  {formData.deskripsiPublik.length > 0 && formData.deskripsiPublik.trim().length < 10 && (
                    <span className="text-[10px] text-amber-600 block">
                      Minimal 10 karakter (kurang {10 - formData.deskripsiPublik.trim().length} karakter lagi)
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Ciri Rahasia / Bukti Kepemilikan (Privat)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">
                        {formData.ciriRahasia.length}/500
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Hanya dilihat petugas</span>
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Contoh: ada stiker di bagian bawah, foto di dalam dompet, wallpaper kunci layar..."
                    value={formData.ciriRahasia}
                    onChange={(e) => setFormData({ ...formData, ciriRahasia: e.target.value })}
                    className="form-input w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">Foto Barang (Opsional, maks 3)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.preview}
                          alt="Pratinjau foto"
                          className="w-full h-24 rounded-xl object-cover border border-slate-200 bg-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -top-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full"
                          aria-label="Hapus foto"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white shadow-md transition-colors hover:bg-rose-700">
                            <X className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {photos.length < MAX_PHOTOS ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Camera: langsung buka kamera belakang di ponsel */}
                      <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-sky-300 bg-sky-50/60 rounded-xl h-20 cursor-pointer hover:bg-sky-50 active:bg-sky-100 transition-colors select-none" title="Ambil foto langsung">
                        <Camera className="w-5 h-5 text-sky-600" />
                        <span className="text-[11px] text-sky-700 font-semibold">Ambil Foto</span>
                        <span className="text-[9px] text-sky-500">Kamera langsung</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(event) => {
                            const files = Array.from(event.target.files || []);
                            addPhotos(files);
                            event.target.value = '';
                          }}
                        />
                      </label>

                      {/* Gallery: pilih dari galeri */}
                      <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded-xl h-20 cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors select-none" title="Pilih dari galeri">
                        <Upload className="w-5 h-5 text-slate-400" />
                        <span className="text-[11px] text-slate-600 font-semibold">Galeri</span>
                        <span className="text-[9px] text-slate-400">Pilih dari file</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            const files = Array.from(event.target.files || []);
                            addPhotos(files);
                            event.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl h-20 flex items-center justify-center bg-slate-50 text-xs text-slate-400">
                      Maksimal {MAX_PHOTOS} foto tercapai
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 block leading-relaxed">Format PNG, JPG, atau WEBP maks 5MB tiap foto{reportType === 'temuan' ? ' · foto akan diburamkan untuk privasi' : ''}. Di ponsel, tombol <span className="font-semibold text-sky-600">Ambil Foto</span> langsung membuka kamera.</span>
                </div>

                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn-secondary text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.deskripsiPublik.trim()) {
                        toast.error('Harap isi deskripsi publik terlebih dahulu.');
                        return;
                      }
                      if (formData.deskripsiPublik.trim().length < 10) {
                        toast.error('Deskripsi publik minimal 10 karakter agar mudah dikenali.');
                        return;
                      }
                      setCurrentStep(3);
                    }}
                    className="btn-primary text-xs"
                  >
                    <span>Lanjut ke Konfirmasi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Kontak & Konfirmasi */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-[#123356]">Kontak Pelapor &amp; Pernyataan</h2>
                  <p className="text-xs text-slate-500">Pastikan informasi kontak Anda dapat dihubungi.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={formData.namaPelapor}
                      onChange={(e) => setFormData({ ...formData, namaPelapor: e.target.value })}
                      className="form-input w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Email Perusahaan</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="form-input w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nomor WhatsApp / Telepon</label>
                  <input
                    type="tel"
                    required
                    maxLength={16}
                    placeholder="Contoh: 081234567890"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: sanitizePhoneInput(e.target.value) })}
                    className="form-input w-full"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Gunakan nomor aktif (awalan 08 atau 628 dengan 10–15 digit) agar petugas dapat menghubungi Anda.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="setuju"
                    checked={formData.setuju}
                    onChange={(e) => setFormData({ ...formData, setuju: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 mt-0.5"
                  />
                  <label htmlFor="setuju" className="select-none leading-relaxed">
                    Saya menyatakan informasi di atas benar dan bersedia dihubungi petugas posko untuk keperluan verifikasi pengembalian barang.
                  </label>
                </div>
                <div className="pt-4 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-secondary text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary text-xs py-2.5 px-6 shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>{isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan Resmi'}</span>
                  </button>
                </div>
              </div>
            )}

          </form>

      </div>

      {/* Success Modal Pop-up */}
      <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in-0" />
          <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-slate-100 text-center space-y-5 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-600 ring-6 ring-emerald-50/70 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest block">
                Laporan Berhasil Disimpan
              </span>
              <DialogTitle className="text-xl sm:text-2xl font-black text-[#123356] tracking-tight">
                Laporan Anda Telah Terdaftar
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Petugas posko keamanan akan memverifikasi dan mencocokkan ciri barang Anda di sistem kantor.
              </DialogDescription>
            </div>

            {/* Dedicated Ticket Code Card */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-left">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Nomor Tiket Resmi
                </span>
                <span className="font-mono text-base sm:text-lg font-extrabold text-[#123356] tracking-wider block truncate select-all">
                  {submittedReportCode || 'Menunggu kode laporan'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!submittedReportCode) return;
                  navigator.clipboard.writeText(submittedReportCode);
                  setIsCopied(true);
                  toast.success(`Nomor tiket ${submittedReportCode} disalin`);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                title="Salin nomor tiket"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 shadow-2xs hover:border-sky-300 min-h-[38px] shrink-0"
              >
                {isCopied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSuccessNavigate(submittedReportId ? `/lacak?report=${submittedReportId}` : '/lacak')}
                className="btn-primary text-xs py-2.5 px-4 shadow-sm min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 font-bold"
              >
                <span>Lacak Status Laporan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleSuccessNavigate('/dashboard')}
                className="btn-secondary text-xs py-2.5 px-4 min-h-[44px] flex-1 font-semibold"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-500">Memuat formulir laporan...</div>}>
      <ReportForm />
    </Suspense>
  );
}
