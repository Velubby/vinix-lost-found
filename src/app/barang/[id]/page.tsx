'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Clock, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { fetchCatalogItemById, submitItemClaim, type CatalogItem } from '@/lib/supabase/items';
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth';
import { validateIndonesianPhone, sanitizePhoneInput, validateCiriKhusus } from '@/lib/validation';
import { toast } from 'sonner';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/cari" className="hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Pencarian</span>
        </Link>
        <span>/</span>
        <span className="text-slate-800">{item.title}</span>
      </nav>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Image & Photo Protection Notice */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-4/3 w-full rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-md">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : <div className="h-full w-full bg-slate-200" aria-label="Foto belum tersedia" />}
          </div>

          {/* Thumbnails */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-sky-600 shadow-xs">
              {item.image ? <Image src={item.image} alt="Thumbnail 1" fill sizes="64px" className="object-cover" /> : null}
            </div>
            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
              + 1 foto
            </div>
          </div>

          {/* Privacy Notice Banner */}
          <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-900 leading-relaxed">
              Foto publik sengaja tidak menampilkan isi bagian dalam atau nomor seri rahasia untuk melindungi pemilik asli dari klaim sembarangan.
            </p>
          </div>
        </div>

        {/* Right Column: Information, Specs, Match Banner & Claim Action */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                {item.status}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123356] tracking-tight">
              {item.title}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {item.category} · Kondisi terawat &amp; aman di posko
            </p>
          </div>

          {/* 3 Specs Cards (Figma Spec Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Lokasi Ditemukan</span>
              </div>
              <span className="text-sm font-bold text-[#123356] block truncate">
                {item.location}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Tanggal Temuan</span>
              </div>
              <span className="text-sm font-bold text-[#123356] block">
                {item.date}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Waktu Ditemukan</span>
              </div>
              <span className="text-sm font-bold text-[#123356] block">
                {item.time}
              </span>
            </div>
          </div>

          {/* Public Description */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ciri Publik
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              {item.description}
            </p>
          </div>

          {/* Verification Box & CTA Button */}
          <div className="apple-card p-5 space-y-4 bg-white/90">
            <div>
              <h3 className="text-sm font-bold text-[#123356]">Merasa ini milikmu?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Siapkan jawaban tentang ciri khusus atau isi barang yang hanya diketahui pemilik sah. Informasi ini akan dicocokkan petugas saat verifikasi.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenClaim}
              disabled={isCheckingAuth}
              aria-busy={isCheckingAuth}
              className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-sky-300" />
              <span>{isCheckingAuth ? 'Memeriksa akun...' : 'Ajukan Klaim Kepemilikan'}</span>
            </button>
          </div>

          <p className="text-xs text-center text-slate-500">
            Butuh bantuan langsung? Hubungi petugas melalui email layanan kantor.
          </p>

        </div>

      </div>

      {/* Ownership verification modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Window title bar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Verifikasi Kepemilikan Barang</span>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            {claimSubmitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-[#123356]">Klaim Berhasil Dikirim!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Permintaan klaim Anda untuk <strong>{item.title}</strong> telah dicatat. Petugas akan meninjau jawaban ciri khusus Anda. Mengalihkan ke pelacakan status...
                </p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
                {claimError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{claimError}</div>}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Secret Ownership</span>
                  <h3 className="text-lg font-bold text-[#123356]">
                    Buktikan bahwa ini barang milikmu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jawab pertanyaan di bawah ini seakurat mungkin. Hanya petugas penanggung jawab yang dapat melihat jawaban ini.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Ciri khusus yang tidak terlihat di foto
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {claimAnswers.ciriKhusus.length}/500 (min. 10)
                    </span>
                  </div>
                  <textarea
                    required
                    rows={3}
                    maxLength={500}
                    placeholder="Contoh: gantungan kunci kecil di resleting dalam, bekas goresan di pojok kanan bawah..."
                    value={claimAnswers.ciriKhusus}
                    onChange={(e) => setClaimAnswers({ ...claimAnswers, ciriKhusus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  {claimAnswers.ciriKhusus.length > 0 && claimAnswers.ciriKhusus.trim().length < 10 && (
                    <span className="text-[10px] text-amber-600 block">
                      Minimal 10 karakter (kurang {10 - claimAnswers.ciriKhusus.trim().length} karakter lagi)
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">
                      Rincian isi di dalam barang (jika berupa tas/dompet)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {claimAnswers.isiBarang.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={500}
                    placeholder="Sebutkan benda atau dokumen apa saja yang ada di dalamnya..."
                    value={claimAnswers.isiBarang}
                    onChange={(e) => setClaimAnswers({ ...claimAnswers, isiBarang: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nomor WhatsApp / Telepon aktif
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    maxLength={16}
                    value={claimAnswers.kontak}
                    onChange={(e) => setClaimAnswers({ ...claimAnswers, kontak: sanitizePhoneInput(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Gunakan nomor aktif (awalan 08 atau 628) agar petugas dapat menghubungi Anda.
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isSubmittingClaim}
                    onClick={() => setIsClaimModalOpen(false)}
                    className="btn-secondary text-xs py-2 px-4 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="btn-primary text-xs py-2 px-5 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>{isSubmittingClaim ? 'Mengirim...' : 'Kirim Pengajuan Klaim'}</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
    ) : (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        {itemError || 'Memuat detail barang...'}
      </div>
    )
  );
}

export default function ItemDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">Memuat detail barang...</div>}>
      <ItemDetailContent />
    </Suspense>
  );
}
