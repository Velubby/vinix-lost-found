import { DEFAULT_PICKUP_LOCATION } from '@/lib/locations';
import type { ReportStatus } from '@/types/claims';

type ReportType = 'hilang' | 'temuan';
type ClaimDecisionStatus = 'ditinjau' | 'disetujui' | 'ditolak' | 'ditutup';

export function reportStatusNotification(input: {
  type: ReportType;
  status: ReportStatus;
  itemTitle: string;
}): { title: string; body: string } | null {
  const { type, status, itemTitle } = input;
  const quoted = `"${itemTitle}"`;

  if (status === 'ditemukan') {
    return type === 'temuan'
      ? {
          title: 'Barang sudah diterima di pos',
          body: `Barang temuan ${quoted} sudah diterima petugas dan tampil di katalog. Pemilik yang cocok bisa mengajukan klaim.`,
        }
      : {
          title: 'Barang ditemukan',
          body: `Barang yang cocok dengan laporan ${quoted} sudah ditemukan dan disimpan di pos. Datang dengan ID karyawan/KTP untuk verifikasi serah terima.`,
        };
  }

  if (status === 'klaim') {
    if (type === 'hilang') return null;
    return {
      title: 'Ada klaim atas barang temuanmu',
      body: `Seseorang mengajukan klaim atas ${quoted}. Petugas sedang memverifikasi ciri kepemilikannya.`,
    };
  }

  if (status === 'selesai') {
    return {
      title: 'Laporan selesai',
      body: type === 'temuan'
        ? `Barang temuan ${quoted} sudah diserahkan kepada pemiliknya.`
        : `Laporan ${quoted} sudah selesai. Barang sudah diserahkan kepadamu.`,
    };
  }

  if (status === 'aktif') {
    return {
      title: 'Laporan aktif',
      body: type === 'temuan'
        ? `Laporan temuan ${quoted} aktif dan menunggu barang diserahkan ke pos.`
        : `Laporan ${quoted} kembali aktif dan dipantau petugas.`,
    };
  }

  return null;
}

export function claimStatusNotification(input: {
  status: ClaimDecisionStatus;
  audience: 'claimant' | 'finder';
  ticketCode: string;
  itemTitle?: string | null;
  pickupLocation?: string | null;
  rejectReason?: string | null;
}): { title: string; body: string } {
  const { status, audience, ticketCode, itemTitle, pickupLocation, rejectReason } = input;
  const item = itemTitle ? ` "${itemTitle}"` : '';

  if (audience === 'finder') {
    if (status === 'disetujui') {
      return {
        title: 'Klaim atas barang temuanmu disetujui',
        body: `Barang temuan${item} akan diserahkan kepada pemilik yang sudah terverifikasi. Tiket ${ticketCode}.`,
      };
    }
    if (status === 'ditolak') {
      return {
        title: 'Klaim atas barang temuanmu ditolak',
        body: `Klaim pada barang temuan${item} ditolak. Barang tetap menunggu pemilik yang cocok.`,
      };
    }
    if (status === 'ditutup') {
      return {
        title: 'Klaim pada barang temuanmu ditutup',
        body: `Barang temuan${item} sudah diklaim pemilik lain yang terverifikasi. Tiket ${ticketCode} ditutup.`,
      };
    }
    return {
      title: 'Klaim atas barang temuanmu sedang ditinjau',
      body: `Seseorang mengajukan klaim pada barang temuan${item}. Petugas sedang memverifikasi ciri kepemilikannya.`,
    };
  }

  if (status === 'disetujui') {
    return {
      title: 'Klaim disetujui',
      body: `Tiket ${ticketCode} disetujui. Ambil barang di ${pickupLocation || DEFAULT_PICKUP_LOCATION} dengan membawa ID karyawan/KTP dan tiket ini.`,
    };
  }

  if (status === 'ditolak') {
    return {
      title: 'Klaim ditolak',
      body: rejectReason
        ? `Klaim ${ticketCode} ditolak. Alasan: ${rejectReason}`
        : `Klaim ${ticketCode} ditolak karena ciri kepemilikan belum cocok. Hubungi petugas kalau kamu punya bukti tambahan.`,
    };
  }

  if (status === 'ditutup') {
    return {
      title: 'Klaim ditutup',
      body: `Tiket ${ticketCode} ditutup karena barang sudah diklaim pemohon lain yang terverifikasi. Hubungi petugas kalau kamu punya bukti tambahan.`,
    };
  }

  return {
    title: 'Klaim sedang ditinjau',
    body: `Petugas sedang memeriksa ciri kepemilikan untuk tiket ${ticketCode}. Kami kabari lagi setelah verifikasi selesai.`,
  };
}
