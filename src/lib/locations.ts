export const OFFICE_NAME = 'PT. Vinix Seven Aurum (VINIX7)';
export const OFFICE_ADDRESS =
  'Jl. Watugede No.58, Wonorejo, Sariharjo, Kec. Ngaglik, Kabupaten Sleman, Daerah Istimewa Yogyakarta 55581';

// Mockup area/lokasi di lingkungan kantor untuk pelaporan kehilangan/temuan
export const OFFICE_LOCATIONS: string[] = [
  'Lobi / Resepsionis Utama',
  'Ruang Administrasi',
  'Ruang Kelas / Training',
  'Ruang Meeting',
  'Ruang Kerja / Studio',
  'Pantry / Dapur',
  'Mushola',
  'Toilet',
  'Area Parkir',
  'Koridor / Tangga',
  'Gudang / Penyimpanan',
  'Area Lainnya di Kantor',
];

// Lokasi penyimpanan/pengambilan barang (pos/ruang penjagaan)
export const PICKUP_LOCATIONS: string[] = [
  'Resepsionis / Lobi Utama VINIX7',
  'Pos Penjagaan VINIX7',
  'Ruang Administrasi VINIX7',
];

export const DEFAULT_PICKUP_LOCATION = PICKUP_LOCATIONS[0];

export const OFFICE_HOURS = 'Senin–Jumat, 08.00–17.00';

export const PICKUP_INSTRUCTIONS =
  `Pengambilan dilakukan ${OFFICE_HOURS}. Datang ke lokasi yang tertera pada tiket (${OFFICE_NAME}, ${OFFICE_ADDRESS}) dengan membawa ID karyawan/KTP dan tunjukkan tiket klaim kepada petugas.`;
