'use client';

import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Upload, Camera, CheckCircle2, ArrowRight, ArrowLeft, Copy, CheckCheck, X, Check } from 'lucide-react';
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
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { TextInput, TextArea, SelectInput } from '@/components/ui/Field';

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

const FORM_STEPS = [
  { id: 1, label: 'Detail Barang' },
  { id: 2, label: 'Ciri Spesifik' },
  { id: 3, label: 'Konfirmasi' },
] as const;

type SelectedPhoto = {
  id: string;
  file: File;
  preview: string;
};

function FormStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Tahapan formulir" className="flex items-start">
      {FORM_STEPS.map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isDone = currentStep > step.id;
        const isLast = index === FORM_STEPS.length - 1;

        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-1 flex-col items-center gap-2 text-center"
          >
            <div className="flex w-full items-center">
              <span
                aria-hidden="true"
                className={cnConnector(index === 0, isDone || isCurrent)}
              />
              <span
                aria-hidden="true"
                className={[
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isCurrent || isDone
                    ? 'bg-brand text-inverse'
                    : 'border border-line-strong bg-surface text-muted',
                ].join(' ')}
              >
                {isDone ? <Check className="size-4" /> : step.id}
              </span>
              <span aria-hidden="true" className={cnConnector(isLast, isDone)} />
            </div>
            <span
              className={[
                'text-[11px] leading-4 sm:text-xs',
                isCurrent ? 'font-semibold text-ink' : isDone ? 'font-medium text-body' : 'text-muted',
              ].join(' ')}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function cnConnector(isEdge: boolean, isFilled: boolean) {
  return ['h-px flex-1', isEdge ? 'bg-transparent' : isFilled ? 'bg-brand' : 'bg-line'].join(' ');
}

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
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted">Memeriksa sesi akun...</div>;
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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Formulir Terpadu"
        title={reportType === 'hilang' ? 'Laporkan Barang Hilang' : 'Laporkan Barang Temuan'}
        description="Isi detail informasi barang. Petugas akan memverifikasi dan mencocokkan data di sistem."
        actions={
          <div
            role="group"
            aria-label="Jenis laporan"
            className="inline-flex w-full rounded-control border border-line bg-surface-muted p-1 sm:w-auto"
          >
            <button
              type="button"
              onClick={() => handleSwitchType('hilang')}
              aria-pressed={reportType === 'hilang'}
              className={[
                'inline-flex min-h-11 flex-1 items-center justify-center rounded-[6px] px-4 text-[13px] transition-colors sm:flex-none',
                reportType === 'hilang'
                  ? 'bg-surface font-semibold text-ink shadow-card'
                  : 'font-medium text-body hover:text-ink',
              ].join(' ')}
            >
              Barang Hilang
            </button>
            <button
              type="button"
              onClick={() => handleSwitchType('temuan')}
              aria-pressed={reportType === 'temuan'}
              className={[
                'inline-flex min-h-11 flex-1 items-center justify-center rounded-[6px] px-4 text-[13px] transition-colors sm:flex-none',
                reportType === 'temuan'
                  ? 'bg-surface font-semibold text-ink shadow-card'
                  : 'font-medium text-body hover:text-ink',
              ].join(' ')}
            >
              Barang Ditemukan
            </button>
          </div>
        }
      />

      <FormStepper currentStep={currentStep} />

      <div className="rounded-card border border-line bg-surface p-5 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div role="alert" className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger">
              {submitError}
            </div>
          )}

          {/* Step 1: Detail Barang */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-line pb-4">
                <h2 className="text-[17px] font-semibold text-ink">Informasi Dasar Barang</h2>
                <p className="text-[13px] leading-5 text-muted">Tentukan nama dan lokasi kejadian sejelas mungkin.</p>
              </div>

              <TextInput
                label="Nama Barang"
                type="text"
                required
                placeholder="Contoh: Dompet Kulit Cokelat, Kunci Motor Honda..."
                value={formData.namaBarang}
                onChange={(e) => setFormData({ ...formData, namaBarang: e.target.value })}
              />

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <SelectInput
                    label="Kategori"
                    value={predefinedCategories.includes(formData.kategori) ? formData.kategori : '__custom__'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value === '__custom__' ? '' : e.target.value })}
                  >
                    <option>Elektronik</option>
                    <option>Dokumen</option>
                    <option>Aksesoris</option>
                    <option>Tas & Pakaian</option>
                    <option>Lainnya</option>
                    <option value="__custom__">Isi sendiri</option>
                  </SelectInput>
                  {!predefinedCategories.includes(formData.kategori) && (
                    <input
                      type="text"
                      required
                      value={formData.kategori}
                      onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                      className="form-input w-full"
                      placeholder="Tulis kategori barang"
                      aria-label="Tulis kategori barang"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <SelectInput
                    label="Lokasi Kejadian"
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
                    required
                  >
                    <option value="">Pilih lokasi...</option>
                    {OFFICE_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    <option value="__custom__">Lainnya (tulis sendiri)</option>
                  </SelectInput>
                  {useCustomLocation && (
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Lobi Utama VINIX7, Ruang Training 2..."
                      value={formData.lokasi}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      className="form-input w-full"
                      aria-label="Tulis lokasi kejadian"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput
                  id="incident-date"
                  label="Tanggal Kejadian"
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
                />

                <fieldset className="min-w-0 space-y-1.5">
                  <legend className="text-[13px] font-semibold text-ink">Jam Kejadian</legend>
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
                    <span aria-hidden="true" className="text-muted">:</span>
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
                <p id="incident-date-time-error" role="alert" className="text-xs font-medium leading-5 text-danger">
                  {dateTimeError}
                </p>
              )}

              <div className="flex justify-end border-t border-line pt-5">
                <Button
                  type="button"
                  className="w-full sm:w-auto"
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
                >
                  <span>Lanjut ke Ciri Spesifik</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Ciri Spesifik & Rahasia */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-line pb-4">
                <h2 className="text-[17px] font-semibold text-ink">Deskripsi &amp; Ciri Khusus</h2>
                <p className="text-[13px] leading-5 text-muted">Ciri privat digunakan untuk memverifikasi pemilik sah.</p>
              </div>

              <TextArea
                label="Deskripsi Publik (Bisa dibaca umum)"
                action={
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {formData.deskripsiPublik.length}/1000 (min. 10)
                  </span>
                }
                rows={3}
                required
                maxLength={1000}
                placeholder="Sebutkan warna utama, bentuk, dan kondisi luar yang wajar diketahui umum..."
                value={formData.deskripsiPublik}
                onChange={(e) => setFormData({ ...formData, deskripsiPublik: e.target.value })}
                hint={
                  formData.deskripsiPublik.length > 0 && formData.deskripsiPublik.trim().length < 10 ? (
                    <span className="text-warning">
                      Minimal 10 karakter (kurang {10 - formData.deskripsiPublik.trim().length} karakter lagi)
                    </span>
                  ) : undefined
                }
              />

              <TextArea
                label="Ciri Rahasia / Bukti Kepemilikan (Privat)"
                action={
                  <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                    <span className="text-xs tabular-nums text-muted">
                      {formData.ciriRahasia.length}/500
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                      <ShieldAlert className="size-3.5" aria-hidden="true" />
                      <span>Hanya dilihat petugas</span>
                    </span>
                  </div>
                }
                rows={2}
                maxLength={500}
                placeholder="Contoh: ada stiker di bagian bawah, foto di dalam dompet, wallpaper kunci layar..."
                value={formData.ciriRahasia}
                onChange={(e) => setFormData({ ...formData, ciriRahasia: e.target.value })}
              />

              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-ink">Foto Barang (Opsional, maks 3)</p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.preview}
                        alt="Pratinjau foto"
                        className="h-24 w-full rounded-surface border border-line bg-surface-muted object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute -right-1 -top-1 flex size-11 items-center justify-center rounded-full"
                        aria-label="Hapus foto"
                      >
                        <span className="flex size-7 items-center justify-center rounded-full bg-danger text-inverse shadow-card transition-colors hover:bg-danger/90">
                          <X className="size-3.5" aria-hidden="true" />
                        </span>
                      </button>
                    </div>
                  ))}
                </div>

                {photos.length < MAX_PHOTOS ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Camera: langsung buka kamera belakang di ponsel */}
                    <label
                      className="flex min-h-24 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-surface border border-dashed border-line-strong bg-surface-muted px-2 py-3 transition-colors hover:border-accent/50 hover:bg-accent/5"
                      title="Ambil foto langsung"
                    >
                      <Camera className="size-5 text-accent" aria-hidden="true" />
                      <span className="text-[13px] font-semibold text-ink">Ambil Foto</span>
                      <span className="text-xs text-muted">Kamera langsung</span>
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
                    <label
                      className="flex min-h-24 cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-surface border border-dashed border-line-strong bg-surface-muted px-2 py-3 transition-colors hover:border-line-strong hover:bg-surface"
                      title="Pilih dari galeri"
                    >
                      <Upload className="size-5 text-muted" aria-hidden="true" />
                      <span className="text-[13px] font-semibold text-ink">Galeri</span>
                      <span className="text-xs text-muted">Pilih dari file</span>
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
                  <div className="flex min-h-24 items-center justify-center rounded-surface border border-dashed border-line-strong bg-surface-muted px-4 text-center text-xs text-muted">
                    Maksimal {MAX_PHOTOS} foto tercapai
                  </div>
                )}
                <span className="block text-xs leading-5 text-muted">
                  Format PNG, JPG, atau WEBP maks 5MB tiap foto{reportType === 'temuan' ? ' · foto akan diburamkan untuk privasi' : ''}. Di ponsel, tombol <span className="font-semibold text-accent">Ambil Foto</span> langsung membuka kamera.
                </span>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  <span>Kembali</span>
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
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
                >
                  <span>Lanjut ke Konfirmasi</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Kontak & Konfirmasi */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-1 border-b border-line pb-4">
                <h2 className="text-[17px] font-semibold text-ink">Kontak Pelapor &amp; Pernyataan</h2>
                <p className="text-[13px] leading-5 text-muted">Pastikan informasi kontak Anda dapat dihubungi.</p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput
                  label="Nama Lengkap"
                  type="text"
                  required
                  value={formData.namaPelapor}
                  onChange={(e) => setFormData({ ...formData, namaPelapor: e.target.value })}
                />

                <TextInput
                  label="Email Perusahaan"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <TextInput
                label="Nomor WhatsApp / Telepon"
                type="tel"
                required
                maxLength={16}
                placeholder="Contoh: 081234567890"
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: sanitizePhoneInput(e.target.value) })}
                hint="Gunakan nomor aktif (awalan 08 atau 628 dengan 10–15 digit) agar petugas dapat menghubungi Anda."
              />

              <div className="flex items-start gap-2.5 rounded-surface border border-line bg-surface-muted p-4 text-[13px] leading-5 text-body">
                <input
                  type="checkbox"
                  id="setuju"
                  checked={formData.setuju}
                  onChange={(e) => setFormData({ ...formData, setuju: e.target.checked })}
                  className="mt-0.5 size-4 rounded border-line-strong accent-accent"
                />
                <label htmlFor="setuju" className="select-none">
                  Saya menyatakan informasi di atas benar dan bersedia dihubungi petugas posko untuk keperluan verifikasi pengembalian barang.
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => setCurrentStep(2)} className="w-full sm:w-auto">
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  <span>Kembali</span>
                </Button>
                <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full sm:w-auto">
                  <span>{isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan Resmi'}</span>
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Success Modal Pop-up */}
      <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogContent className="fixed left-[50%] top-[50%] z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] space-y-5 overflow-y-auto rounded-card border border-line bg-surface p-6 text-center shadow-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:p-7">
            <button
              type="button"
              onClick={() => setIsSuccess(false)}
              className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label="Tutup modal"
            >
              <X className="size-5" />
            </button>

            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-success">
                Laporan Berhasil Disimpan
              </span>
              <DialogTitle className="text-xl font-semibold text-ink sm:text-2xl">
                Laporan Anda Telah Terdaftar
              </DialogTitle>
              <DialogDescription className="mx-auto mt-1 max-w-sm text-[13px] leading-5 text-body">
                Petugas posko keamanan akan memverifikasi dan mencocokkan ciri barang Anda di sistem kantor.
              </DialogDescription>
            </div>

            {/* Dedicated Ticket Code Card */}
            <div className="flex items-center justify-between gap-3 rounded-surface border border-line bg-surface-muted p-3.5 text-left">
              <div className="min-w-0 space-y-0.5">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Nomor Tiket Resmi
                </span>
                <span className="block select-all truncate font-mono text-base font-semibold tabular-nums tracking-wider text-ink sm:text-lg">
                  {submittedReportCode || 'Menunggu kode laporan'}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!submittedReportCode) return;
                  navigator.clipboard.writeText(submittedReportCode);
                  setIsCopied(true);
                  toast.success(`Nomor tiket ${submittedReportCode} disalin`);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                title="Salin nomor tiket"
                className="shrink-0"
              >
                {isCopied ? (
                  <>
                    <CheckCheck className="size-3.5 text-success" aria-hidden="true" />
                    <span className="text-success">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 text-muted" aria-hidden="true" />
                    <span>Salin</span>
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col justify-center gap-2.5 pt-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => handleSuccessNavigate(submittedReportId ? `/lacak?report=${submittedReportId}` : '/lacak')}
                className="flex-1"
              >
                <span>Lacak Status Laporan</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSuccessNavigate('/dashboard')}
                className="flex-1"
              >
                Kembali ke Dashboard
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted">Memuat formulir laporan...</div>}>
      <ReportForm />
    </Suspense>
  );
}
