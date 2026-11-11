---
version: alpha
name: VINIX7 Lost & Found
description: Sistem internal Lost & Found PT. Vinix Seven Aurum untuk melaporkan, mencari, dan mengklaim barang hilang atau temuan di lingkungan kantor.
colors:
  background: "#f6f7f9"
  surface: "#ffffff"
  surface-muted: "#f8fafc"
  line: "#e4e8ee"
  line-strong: "#cbd5e1"
  brand: "#123356"
  brand-hover: "#0c233c"
  brand-dark: "#0b1f33"
  accent: "#003399"
  highlight: "#fbe156"
  ink: "#123356"
  body: "#475569"
  muted: "#64748b"
  inverse: "#ffffff"
  success: "#047857"
  success-soft: "#ecfdf5"
  warning: "#b45309"
  warning-soft: "#fffbeb"
  danger: "#be123c"
  danger-soft: "#fff1f2"
  info: "#123356"
  info-soft: "#eef2f7"
typography:
  sans:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Helvetica Neue", sans-serif'
rounded:
  control: 8px
  surface: 12px
  card: 16px
  pill: 9999px
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.inverse}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand}"
    rounded: "{rounded.control}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
  status-badge:
    rounded: "{rounded.pill}"
  status-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
  status-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
  status-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
omitted:
  - section: spacing
    reason: "Tidak ada skala jarak bernama; layout memakai skala default Tailwind."
---

## Overview

Sistem internal untuk karyawan VINIX7: melaporkan barang hilang atau temuan, mencari barang temuan, mengajukan klaim, dan memantau serah terima. Arah visualnya adalah **Vinix Atrium**: ruang kerja internal yang tenang, tegas, dan terpercaya. Navy dipakai sebagai tinta, permukaan putih sebagai kanvas, dan kuning dari mark V7 dipakai sangat sedikit sebagai tanda.

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1. Halaman terasa hidup lewat tipografi dan komposisi, bukan lewat animasi dekoratif.

## Colors

Palet dibatasi pada tiga peran inti dan satu aksen. Status memakai warna semantik yang terpisah dan hanya muncul di badge atau panel keadaan.

- **Brand**: navy `#123356` untuk teks utama, tombol primer, dan permukaan gelap. Hover memakai `#0c233c`; footer memakai `#0b1f33`.
- **Accent**: biru royal `#003399` dari wordmark, hanya untuk tautan dan focus ring. Kontras 10.86:1 di atas putih.
- **Highlight**: kuning `#fbe156` dari mark V7. Hanya untuk garis, dot, atau penanda dekoratif. Jangan pernah dipakai sebagai teks di atas putih (1.31:1).
- **Background dan surface**: `#f6f7f9` memisahkan permukaan putih dari halaman; `#f8fafc` untuk permukaan sekunder.
- **Line**: `#e4e8ee` untuk border tipis; `#cbd5e1` untuk border yang perlu lebih tegas.
- **Text**: `ink` `#123356` untuk judul dan teks utama; `body` `#475569` untuk paragraf; `muted` `#64748b` hanya untuk metadata minimal 12px.
- **Status**: `success` `#047857` di `#ecfdf5`, `warning` `#b45309` di `#fffbeb`, `danger` `#be123c` di `#fff1f2`, `info` `#123356` di `#eef2f7`. Semua pasangan lolos AA untuk teks normal.
- Jangan memakai ungu, indigo, atau warna dekoratif lain. Satu aksen per layar.

## Typography

Hanya ada satu keluarga font, yaitu stack sistem (SF Pro di Apple, fallback Inter dan Helvetica Neue). Huruf mengikuti perangkat pengguna agar terasa seperti aplikasi native.

| Role | Size / line | Weight |
|---|---|---|
| Display | 44/52, turun ke 34/42 di ponsel | 600 |
| H1 | 30/38 | 600 |
| H2 | 22/30 | 600 |
| H3 | 17/26 | 600 |
| Body | 15/24 | 400 |
| Small | 13/20 | 400–500 |
| Caption | 12/18 (minimum) | 500 |
| Eyebrow | 11/16, 0.12em, uppercase | 600 |

- Hierarki dibuat lewat ukuran dan berat, bukan lewat keluarga font kedua.
- Berhenti memakai `font-extrabold` untuk semua judul; maksimum 600.
- `text-balance` untuk H1/H2, `text-pretty` untuk paragraf, `tabular-nums` untuk tanggal, kode tiket, dan counter.
- Tidak ada teks di bawah 12px.
- Eyebrow adalah satu-satunya tempat letter-spacing dipakai secara sengaja; jangan menambahkan tracking ke tombol, badge, atau judul.

## Layout

- **Container**: `max-w-6xl` (1152px) untuk dashboard, detail, dan lacak; `max-w-7xl` (1280px) untuk katalog dan admin; `max-w-3xl` (768px) untuk form, bantuan, dan pengaturan.
- Padding halaman: 16px di ponsel, 24px di tablet, 32px di desktop.
- Grid 12 kolom dengan gap 24–32px. Detail memakai 7/5; katalog memakai 3/9.
- Tata letak mobile-first. Dua kolom hanya muncul mulai breakpoint `lg`; di bawahnya semua konten menumpuk.
- Header situs sticky, tinggi 64px di desktop dan 56px di ponsel, dengan `safe-area-inset-top`.
- Target sentuh minimal 44px untuk tombol, input, dan icon-only control.

## Elevation & Depth

- Kartu statis duduk datar: border 1px dan bayangan `0 1px 2px rgba(9, 21, 36, 0.04)`.
- Hanya kartu interaktif yang boleh berubah border atau bayangan saat hover. Tidak ada lift `translateY`.
- Dialog dan panel memakai bayangan overlay `0 24px 64px -12px rgba(9, 21, 36, 0.24)`.
- Glass hanya di header. Jangan menambahkan `backdrop-blur` ke kartu, modal, atau panel lain.

## Shapes

- Kontrol (tombol, input, select) memakai radius `control` 8px.
- Permukaan kecil (thumbnail, tile ikon) memakai radius `surface` 12px.
- Kartu dan dialog memakai radius `card` 16px.
- Badge status memakai radius `pill` 9999px.
- Jangan memakai radius 20px atau 24px untuk kartu; gunakan skala di atas.

## Components

- **Tombol utama**: navy penuh, teks putih, radius `control`, tinggi minimal 44px. Satu aksi utama per layar. Tanpa `translateY` saat hover.
- **Tombol sekunder**: permukaan putih dengan border tipis dan teks navy. Untuk aksi pendamping.
- **Field**: label 13px/600, kontrol 44px dengan teks 15px, helper 12px, error 12px. Error memakai `aria-describedby`, `aria-invalid`, dan warna `danger`.
- **Kartu**: permukaan putih, border `line`, radius `card`, bayangan tipis. Varian `interactive` hanya untuk kartu yang benar-benar bisa diklik.
- **Badge status**: pill, teks 12px/600, dot 6px. Warna dari peta status kanonik; jangan membuat peta warna lokal.
- **Dialog**: memakai `Modal` Radix yang sudah ada. Fokus terperangkap, Escape menutup, fokus kembali ke trigger, tombol tutup 44px dengan `aria-label`.
- **Stepper dan timeline**: satu komponen bersama untuk lapor dan lacak. Horizontal di desktop, vertikal di ponsel.
- **Empty state**: ikon 48px, judul, satu kalimat sebab, dan satu aksi utama.
- **Header dan footer**: header memakai permukaan tembus pandang dengan satu blur; footer memakai navy gelap, teks `line-strong`, dan garis kuning 2px di atas.

## Motion

- Durasi 150ms dengan `ease-out`.
- Hanya `color`, `border-color`, `opacity`, dan `transform` yang boleh dianimasikan.
- Tidak ada gradient, zoom gambar kartu, hover lift, atau pulse tanpa henti.
- Hormati `prefers-reduced-motion`: matikan transisi non-esensial.

## Accessibility

- Semua teks minimal 4.5:1; teks besar minimal 3:1.
- Jangan memakai `slate-400` untuk teks di atas putih; gunakan `body` atau `muted` pada ukuran minimal 12px.
- Semua kontrol interaktif punya nama aksesibel; icon-only button memakai `aria-label`.
- Fokus keyboard selalu terlihat; jangan menghapus outline tanpa pengganti.
- Dialog, menu, dan tab memakai primitive yang sudah ada; jangan membangun ulang perilaku fokus dengan tangan.
