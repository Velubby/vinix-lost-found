'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { fetchCatalogItemById, submitItemClaim, type CatalogItem } from '@/lib/supabase/items';
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth';
import { validateIndonesianPhone, sanitizePhoneInput, validateCiriKhusus } from '@/lib/validation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes('ditemukan')) return 'bg-info-soft text-info';
  if (value.includes('tersedia')) return 'bg-success-soft text-success';
  if (value.includes('menunggu')) return 'bg-warning-soft text-warning';
  return 'bg-surface-muted text-body';
}

function ItemDetailContent() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.id as string;

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [itemError, setItemError] = useState('');

  useEffect(() => {
    fetchCatalogItemById(itemId)
      .then((foundItem) => {
        if (foundItem) setItem(foundItem);
        else setItemError('Barang tidak ditemukan.');
      })
      .catch(() => setItemError('Detail barang belum dapat dimuat.'));
  }, [itemId]);

  // Modal claim state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimAnswers, setClaimAnswers] = useState({
    ciriKhusus: '',
    isiBarang: '',
    kontak: ''
  });

  const handleOpenClaim = async () => {
    if (isCheckingAuth) return;
    setIsCheckingAuth(true);

    try {
      if (item) {
        const s = item.status.toLowerCase();
        if (s === 'menunggu penyerahan' || item.diterima_di_pos === false) {
          toast.error('Barang harus dikonfirmasi diterima di pos/penyimpanan sebelum dapat diklaim.');
          return;
        }
        if (s === 'klaim disetujui' || s === 'selesai') {
          toast.error('Barang ini sudah dikembalikan kepada pemiliknya.');
          return;
        }
      }

      const user = await getCurrentUser();
      if (!user) {
        router.push(`/masuk?${new URLSearchParams({ next: `/barang/${itemId}` })}`);
        return;
      }

      // Pre-fill kontak from user profile if not yet filled
      const profile = await getUserProfile(user.id);
      const userPhone = profile?.phone || profile?.phone_number || '';
      setClaimAnswers((prev) => ({
        ...prev,
        kontak: prev.kontak || userPhone,
      }));

      setClaimError('');
      setIsClaimModalOpen(true);
    } catch {
      toast.error('Akun belum dapat diperiksa. Periksa koneksi dan coba lagi.');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || isSubmittingClaim) return;

    // Validasi ciri khusus
    const ciriValidation = validateCiriKhusus(claimAnswers.ciriKhusus);
    if (!ciriValidation.isValid) {
      const errorMsg = ciriValidation.error || 'Ciri khusus belum valid.';
      setClaimError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validasi nomor kontak
    const contactPhone = claimAnswers.kontak.trim();
    const phoneValidation = validateIndonesianPhone(contactPhone);
    if (!phoneValidation.isValid) {
      const errorMsg = phoneValidation.error || 'Nomor telepon tidak valid.';
      setClaimError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      setClaimError('Silakan masuk atau buat akun terlebih dahulu untuk mengajukan klaim.');
      toast.error('Silakan masuk terlebih dahulu untuk mengajukan klaim.');
      return;
    }

    // Cek status item: klaim hanya bisa dilakukan jika barang sudah diterima di pos
    const itemDetail = await fetchCatalogItemById(item.id);
    if (!itemDetail) {
      setClaimError('Barang tidak ditemukan.');
      toast.error('Barang tidak ditemukan.');
      return;
    }

    const itemStatus = itemDetail.status.toLowerCase();
    if (itemStatus === 'menunggu penyerahan' || itemDetail.diterima_di_pos === false) {
      setClaimError('Barang harus dikonfirmasi diterima di pos/penyimpanan sebelum dapat diklaim.');
      toast.error('Barang harus dikonfirmasi diterima di pos/penyimpanan sebelum dapat diklaim.');
      return;
    }

    if (itemStatus === 'klaim disetujui' || itemStatus === 'selesai') {
      setClaimError('Barang ini sudah dikembalikan kepada pemiliknya dan tidak dapat diklaim lagi.');
      toast.error('Barang ini sudah dikembalikan kepada pemiliknya.');
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const savedClaim = await submitItemClaim({
        itemId: item.id,
        userId: user.id,
        privateAnswers: `${claimAnswers.ciriKhusus.trim()}${claimAnswers.isiBarang.trim() ? `\n${claimAnswers.isiBarang.trim()}` : ''}`,
        contactPhone: phoneValidation.normalized || contactPhone,
      });
      setClaimError('');
      setClaimSubmitted(true);
      toast.success('Pengajuan klaim berhasil dikirim!');
      setTimeout(() => {
        setIsClaimModalOpen(false);
        router.push(`/lacak?ticket=${savedClaim.ticket_code}`);
      }, 2000);
      return;
    } catch (error) {
      if (error instanceof Error && error.message === 'DUPLICATE_CLAIM') {
        setClaimError('Kamu sudah punya klaim aktif untuk barang ini. Cek tiket di halaman Lacak.');
        toast.error('Kamu sudah punya klaim aktif untuk barang ini.');
      } else {
        setClaimError('Klaim belum dapat disimpan. Coba lagi nanti.');
        toast.error('Klaim belum dapat disimpan. Coba lagi nanti.');
      }
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  return (
    item ? (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex min-w-0 items-center gap-2 text-[13px] text-muted">
        <Link
          href="/cari"
          className="inline-flex min-h-9 items-center gap-1.5 font-medium text-body transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span>Kembali ke Pencarian</span>
        </Link>
        <span aria-hidden="true" className="text-line-strong">/</span>
        <span className="truncate text-muted">{item.title}</span>
      </nav>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        {/* Left Column: Image & Photo Protection Notice */}
        <div className="space-y-4 lg:col-span-7">
          <div className="relative aspect-4/3 w-full overflow-hidden rounded-card border border-line bg-surface-muted">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="size-full bg-surface-muted" aria-label="Foto belum tersedia" />
            )}
          </div>

          {/* Privacy Notice Banner */}
          <div className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="text-pretty text-[13px] leading-5 text-body">
              Foto publik sengaja tidak menampilkan isi bagian dalam atau nomor seri rahasia untuk melindungi pemilik asli dari klaim sembarangan.
            </p>
          </div>
        </div>

        {/* Right Column: Information, Specs, Match Banner & Claim Action */}
        <div className="space-y-7 lg:col-span-5">
          <div className="space-y-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold ${statusTone(item.status)}`}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {item.status}
            </span>

            <h1 className="text-balance text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-ink sm:text-[2.125rem] sm:leading-[1.18]">
              {item.title}
            </h1>
            <p className="text-pretty text-sm leading-6 text-body">
              {item.category} · Kondisi terawat &amp; aman di posko
            </p>
          </div>

          {/* Specs Grid */}
          <dl className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex items-start gap-3 p-4">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs font-medium text-muted">Lokasi Ditemukan</dt>
                <dd className="text-sm font-semibold text-ink">{item.location}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4">
              <Calendar className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs font-medium text-muted">Tanggal Temuan</dt>
                <dd className="text-sm font-semibold tabular-nums text-ink">{item.date}</dd>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4">
              <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 space-y-0.5">
                <dt className="text-xs font-medium text-muted">Waktu Ditemukan</dt>
                <dd className="text-sm font-semibold tabular-nums text-ink">{item.time}</dd>
              </div>
            </div>
          </dl>

          {/* Public Description */}
          <div className="space-y-2 border-t border-line pt-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Ciri Publik
            </h2>
            <p className="text-pretty text-sm leading-6 text-body">
              {item.description}
            </p>
          </div>

          {/* Verification Box & CTA Button */}
          <div className="space-y-4 rounded-card border border-line bg-surface p-5 sm:p-6">
            <div className="space-y-1.5">
              <h3 className="text-[15px] font-semibold text-ink">Merasa ini milikmu?</h3>
              <p className="text-pretty text-[13px] leading-5 text-body">
                Siapkan jawaban tentang ciri khusus atau isi barang yang hanya diketahui pemilik sah. Informasi ini akan dicocokkan petugas saat verifikasi.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleOpenClaim}
              disabled={isCheckingAuth}
              loading={isCheckingAuth}
              className="w-full"
              size="lg"
            >
              {!isCheckingAuth && <ShieldCheck className="size-4" aria-hidden="true" />}
              <span>{isCheckingAuth ? 'Memeriksa akun...' : 'Ajukan Klaim Kepemilikan'}</span>
            </Button>
          </div>

          <p className="text-center text-xs leading-5 text-muted">
            Butuh bantuan langsung? Hubungi petugas melalui email layanan kantor.
          </p>
        </div>
      </div>

      {/* Ownership verification modal */}
      <Modal
        open={isClaimModalOpen}
        onOpenChange={(open) => {
          if (!isSubmittingClaim) setIsClaimModalOpen(open);
        }}
        title="Verifikasi Kepemilikan Barang"
        size="md"
        cancelText="Batal"
        loading={isSubmittingClaim}
        action={claimSubmitted ? undefined : (
          <Button
            type="submit"
            form="claim-form"
            disabled={isSubmittingClaim}
            loading={isSubmittingClaim}
          >
            {isSubmittingClaim ? 'Mengirim...' : 'Kirim Pengajuan Klaim'}
          </Button>
        )}
      >
        {claimSubmitted ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </div>
            <h3 className="text-balance text-lg font-semibold text-ink">Klaim Berhasil Dikirim!</h3>
            <p className="mx-auto max-w-sm text-pretty text-[13px] leading-5 text-body">
              Permintaan klaim Anda untuk <strong className="font-semibold text-ink">{item.title}</strong> telah dicatat. Petugas akan meninjau jawaban ciri khusus Anda. Mengalihkan ke pelacakan status...
            </p>
          </div>
        ) : (
          <form id="claim-form" onSubmit={handleClaimSubmit} className="space-y-5">
            {claimError && (
              <div
                role="alert"
                className="rounded-control border border-danger/20 bg-danger-soft px-3 py-2.5 text-[13px] leading-5 text-danger"
              >
                {claimError}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Secret Ownership
              </p>
              <h3 className="text-balance text-lg font-semibold text-ink">
                Buktikan bahwa ini barang milikmu
              </h3>
              <p className="text-pretty text-[13px] leading-5 text-body">
                Jawab pertanyaan di bawah ini seakurat mungkin. Hanya petugas penanggung jawab yang dapat melihat jawaban ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="claim-ciri" className="block text-[13px] font-semibold text-ink">
                  Ciri khusus yang tidak terlihat di foto
                </label>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {claimAnswers.ciriKhusus.length}/500 (min. 10)
                </span>
              </div>
              <textarea
                id="claim-ciri"
                required
                rows={3}
                maxLength={500}
                placeholder="Contoh: gantungan kunci kecil di resleting dalam, bekas goresan di pojok kanan bawah..."
                value={claimAnswers.ciriKhusus}
                onChange={(e) => setClaimAnswers({ ...claimAnswers, ciriKhusus: e.target.value })}
                aria-describedby={
                  claimAnswers.ciriKhusus.length > 0 && claimAnswers.ciriKhusus.trim().length < 10
                    ? 'claim-ciri-hint'
                    : undefined
                }
                aria-invalid={
                  claimError && !validateCiriKhusus(claimAnswers.ciriKhusus).isValid ? true : undefined
                }
                className="form-input w-full text-base sm:text-[15px]"
              />
              {claimAnswers.ciriKhusus.length > 0 && claimAnswers.ciriKhusus.trim().length < 10 && (
                <span id="claim-ciri-hint" className="block text-xs leading-5 text-warning">
                  Minimal 10 karakter (kurang {10 - claimAnswers.ciriKhusus.trim().length} karakter lagi)
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="claim-isi" className="block text-[13px] font-semibold text-ink">
                  Rincian isi di dalam barang (jika berupa tas/dompet)
                </label>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {claimAnswers.isiBarang.length}/500
                </span>
              </div>
              <textarea
                id="claim-isi"
                rows={2}
                maxLength={500}
                placeholder="Sebutkan benda atau dokumen apa saja yang ada di dalamnya..."
                value={claimAnswers.isiBarang}
                onChange={(e) => setClaimAnswers({ ...claimAnswers, isiBarang: e.target.value })}
                className="form-input w-full text-base sm:text-[15px]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="claim-kontak" className="block text-[13px] font-semibold text-ink">
                Nomor WhatsApp / Telepon aktif
              </label>
              <input
                id="claim-kontak"
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                maxLength={16}
                value={claimAnswers.kontak}
                onChange={(e) => setClaimAnswers({ ...claimAnswers, kontak: sanitizePhoneInput(e.target.value) })}
                aria-describedby="claim-kontak-hint"
                aria-invalid={
                  claimError && !validateIndonesianPhone(claimAnswers.kontak).isValid ? true : undefined
                }
                className="form-input w-full text-base sm:text-[15px]"
              />
              <span id="claim-kontak-hint" className="block text-xs leading-5 text-muted">
                Gunakan nomor aktif (awalan 08 atau 628) agar petugas dapat menghubungi Anda.
              </span>
            </div>
          </form>
        )}
      </Modal>
    </div>
    ) : (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted">
        {itemError || 'Memuat detail barang...'}
      </div>
    )
  );
}

export default function ItemDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted">
          Memuat detail barang...
        </div>
      }
    >
      <ItemDetailContent />
    </Suspense>
  );
}
