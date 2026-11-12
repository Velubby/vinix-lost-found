# VINIX7 Lost & Found

Sistem internal Lost & Found PT. Vinix Seven Aurum (VINIX7). Karyawan dapat melaporkan barang hilang atau temuan, mencari barang temuan, dan mengajukan klaim kepemilikan. Petugas memverifikasi klaim dan menyerahkan barang di kantor.

## Tentang aplikasi

Barang temuan hanya tampil di katalog setelah petugas memastikan barang fisik sudah diterima dan disimpan. Pemilik dapat mengajukan klaim kapan saja setelah barang muncul di katalog, lalu mengambilnya pada jam kerja kantor sesuai lokasi yang tertera di tiket.

Aplikasi ini hanya untuk karyawan VINIX7. Pendaftaran dibatasi oleh domain email perusahaan.

## Peran pengguna

- **karyawan**: melapor, mencari barang temuan, mengajukan klaim, dan memantau laporan serta klaim.
- **admin**: petugas frontdesk, pos keamanan, atau admin yang menerima barang, memverifikasi klaim, dan mencatat serah terima.

## Fitur utama

### Karyawan

- Mencari barang temuan berdasarkan kata kunci, kategori, lokasi, dan tanggal.
- Melaporkan barang hilang atau temuan beserta keterangan dan foto opsional.
- Mengajukan klaim dengan ciri khusus barang dan nomor yang dapat dihubungi.
- Melacak status laporan dan klaim, termasuk riwayat aktivitas dan tiket pengambilan.
- Menerima notifikasi saat status laporan atau klaim berubah.
- Mengubah profil dan nomor telepon.

### Admin

- Mengonfirmasi penerimaan fisik barang temuan sebelum barang tampil di katalog.
- Meninjau laporan kehilangan dan mencocokkan ciri kepemilikan pada klaim.
- Menyetujui atau menolak klaim, serta menentukan lokasi pengambilan.
- Menandai serah terima setelah pemilik mengambil barang.
- Menutup laporan kehilangan setelah barang dikembalikan.

## Alur penanganan

1. Karyawan melaporkan barang temuan lewat aplikasi, atau menyerahkan barang langsung ke petugas.
2. Petugas menerima barang, menyimpannya, lalu mengonfirmasi penerimaan di aplikasi. Barang baru muncul di katalog setelah konfirmasi ini.
3. Pemilik menemukan barangnya di katalog dan mengajukan klaim dengan menjelaskan ciri khusus.
4. Petugas mencocokkan ciri kepemilikan. Jika disetujui, petugas menentukan lokasi pengambilan.
5. Pemilik datang pada jam kerja kantor, membawa ID karyawan/KTP dan menunjukkan tiket klaim.
6. Petugas menyerahkan barang dan menandai serah terima. Laporan temuan dan klaim menjadi selesai.

Tidak ada penjadwalan pengambilan. Barang yang belum diklaim tetap tampil di katalog sampai petugas menutupnya.

## Teknologi

Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Radix UI, dan Supabase (PostgreSQL, Auth, Storage).

## Menjalankan di komputer sendiri

Siapkan Node.js, npm, dan proyek Supabase.

### 1. Clone dan instal dependensi

```bash
git clone <repository-url>
cd vinix-lost-found
npm install
```

### 2. Buat `.env.local`

Isi dengan nilai dari dashboard Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=vinix7.id
```

`NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` menerima beberapa domain yang dipisahkan koma, tanpa `@`. Service role key hanya dipakai di server (notifikasi dan tugas admin), jangan pernah diekspos ke browser.

### 3. Siapkan Supabase

Pada proyek Supabase baru, jalankan [supabase/schema.sql](supabase/schema.sql) melalui SQL Editor. Skrip ini membuat tabel, aturan akses, trigger, serta bucket foto publik `item-images` dan bucket privat `item-originals` untuk foto asli yang hanya dibaca petugas.

Untuk proyek yang sudah berjalan, jalankan [supabase/hardening.sql](supabase/hardening.sql) setelah `schema.sql`. Patch ini menyelaraskan trigger klaim, aturan baca katalog, dan kebijakan klaim. Aman dijalankan berulang.

Jalankan [supabase/auth-domain-guard.sql](supabase/auth-domain-guard.sql) untuk menegakkan pembatasan domain email di sisi server (mencegah pendaftaran langsung lewat Supabase Auth dengan domain di luar daftar). Sesuaikan daftar domain di skrip agar sama dengan `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`.

Gunakan provider Email untuk pendaftaran dan login email/password. Login Google tidak dipakai. Pengaturan **Confirm email** menentukan apakah pengguna harus mengonfirmasi email sebelum masuk.

Untuk membuat akun admin, daftar lewat aplikasi lalu ubah kolom `role` pada baris akun tersebut di tabel `profiles` menjadi `admin` melalui Table Editor Supabase. Akun baru memiliki peran bawaan `karyawan`.

### 4. Jalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Lokasi kantor

PT. Vinix Seven Aurum (VINIX7)
Jl. Watugede No.58, Wonorejo, Sariharjo, Kec. Ngaglik, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55581

Alamat ini dipakai pada instruksi pengambilan barang. Daftar lokasi penyimpanan dan pengambilan ada di [src/lib/locations.ts](src/lib/locations.ts).

## Pengecekan kode

```bash
npm run lint
npm run build
```

### Uji alur E2E

`npm run test:e2e` menjalankan alur karyawan dan admin terhadap proyek Supabase pada `.env.local`. Skrip membutuhkan service role key, akun uji karyawan dan admin yang sudah terdaftar, serta foto uji di `foto-data-uji/`.

Folder `foto-data-uji/` tidak disertakan di repo karena hanya data uji lokal. Siapkan folder itu dengan nama file sesuai daftar di [scripts/e2e-test.mjs](scripts/e2e-test.mjs) sebelum menjalankan pengujian. Skrip membersihkan data alur yang dibuatnya, tetapi item katalog hasil seed tetap tersimpan.
