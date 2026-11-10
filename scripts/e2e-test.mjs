// Temporary E2E test script for VINIX7 Lost & Found.
// Seeds 10 found items from foto-data-uji, then exercises the two-role flow
// against the live Supabase project. Run with: npm run test:e2e
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('Missing Supabase env values in .env.local');
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(URL, SERVICE, opts);
const anon = createClient(URL, ANON, opts);
const karyawan = createClient(URL, ANON, opts);
const admin = createClient(URL, ANON, opts);

const results = [];
const runTag = `E2E-${Date.now().toString(36).toUpperCase()}`;

function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
}

function summarizeError(error) {
  if (!error) return '';
  return `${error.code ?? ''} ${error.message ?? error}`.trim();
}

const PHOTOS = [
  { file: 'brd-20109_blue-light-glasses-kacamata-anti-radiasi-layar-komputer-smartphone-tv-kaca-mata-kerja-baca_full01-4eb9feed.webp', title: 'Kacamata anti radiasi', category: 'Aksesoris' },
  { file: 'cardigan.jpg', title: 'Cardigan abu-abu', category: 'Tas & Pakaian' },
  { file: 'kabel-charger.webp', title: 'Kabel charger USB-C', category: 'Elektronik' },
  { file: 'keyless-motor-1760682535106_169.jpeg', title: 'Keyless motor', category: 'Elektronik' },
  { file: 'sajadah.jpeg', title: 'Sajadah lipat', category: 'Lainnya' },
  { file: 'Sandisk-Cruzer-Blade.png', title: 'Flashdisk SanDisk 16GB', category: 'Elektronik' },
  { file: 'stapler-stapler-joyko-hd-50-1-pcs-joyko-shopname-2155824.webp', title: 'Stapler Joyko', category: 'Lainnya' },
  { file: 'Transparent-Umbrella-with-Light.webp', title: 'Payung transparan', category: 'Lainnya' },
  { file: 'tumbler.jpeg', title: 'Tumbler minum', category: 'Lainnya' },
  { file: 'tws.png', title: 'TWS earbuds', category: 'Elektronik' }
];

const LOCATIONS = ['Lobi / Resepsionis Utama', 'Ruang Meeting', 'Pantry / Dapur', 'Area Parkir', 'Ruang Kerja / Studio'];

function ticketCode(i) {
  return `TKT-${runTag.slice(-6)}-${String(i).padStart(4, '0')}`;
}

function reportCode(i) {
  return `${runTag}-F${String(i).padStart(2, '0')}`;
}

async function cleanup() {
  const { data: reports } = await service
    .from('reports')
    .select('id')
    .like('report_code', 'E2E-%');
  if (reports?.length) {
    const ids = reports.map((r) => r.id);
    await service.from('reports').delete().in('id', ids);
  }
  const { data: items } = await service
    .from('items')
    .select('id, title')
    .like('title', '[E2E]%');
  if (items?.length) {
    await service.from('items').delete().in('id', items.map((i) => i.id));
  }
  const { data: flowItems } = await service
    .from('items')
    .select('id')
    .like('title', '[E2E-FLOW]%');
  if (flowItems?.length) {
    await service.from('items').delete().in('id', flowItems.map((i) => i.id));
  }
}

async function signIn(client, email, password, label) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  check(`Login ${label}`, !error && !!data.user, summarizeError(error));
  if (error) process.exit(1);
  return data.user;
}

async function main() {
  console.log(`Run tag: ${runTag}`);
  console.log(`Supabase: ${URL}`);

  await cleanup();

  const karyawanUser = await signIn(karyawan, 'karyawan@vinixsevenaurum.co.id', 'karyawan123', 'karyawan');
  const adminUser = await signIn(admin, 'admin@vinixsevenaurum.co.id', 'admin123', 'admin');

  const { data: profiles } = await service
    .from('profiles')
    .select('id, role, full_name, department')
    .in('id', [karyawanUser.id, adminUser.id]);
  const roleOf = (id) => profiles?.find((p) => p.id === id)?.role;
  check('Profil karyawan role = karyawan', roleOf(karyawanUser.id) === 'karyawan', roleOf(karyawanUser.id));
  check('Profil admin role = admin', roleOf(adminUser.id) === 'admin', roleOf(adminUser.id));

  // 1. Upload photos and create found reports.
  const created = [];
  for (let i = 0; i < PHOTOS.length; i++) {
    const photo = PHOTOS[i];
    const owner = i < 7 ? karyawan : admin;
    const ownerId = i < 7 ? karyawanUser.id : adminUser.id;
    const bytes = fs.readFileSync(path.join('foto-data-uji', photo.file));
    const ext = path.extname(photo.file);
    const objectPath = `${ownerId}/e2e/${runTag}-${i}${ext}`;
    const { error: uploadError } = await owner.storage
      .from('item-images')
      .upload(objectPath, bytes, { contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg', upsert: true });
    check(`Upload foto ${i + 1} (${photo.title})`, !uploadError, summarizeError(uploadError));
    if (uploadError) continue;
    const { data: pub } = owner.storage.from('item-images').getPublicUrl(objectPath);

    const { data: report, error: reportError } = await owner
      .from('reports')
      .insert({
        report_code: reportCode(i + 1),
        user_id: ownerId,
        type: 'temuan',
        item_title: `[E2E] ${photo.title}`,
        category: photo.category,
        location: LOCATIONS[i % LOCATIONS.length],
        incident_at: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
        public_description: `Barang temuan uji: ${photo.title}. Ditemukan di area kantor.`,
        private_description: `CIRI RAHASIA UJI ${i + 1}: tanda khusus hanya untuk verifikasi admin.`,
        image_url: pub.publicUrl,
        contact_phone: '081234567890',
        status: 'aktif'
      })
      .select('id, report_code')
      .single();
    check(`Buat laporan temuan ${i + 1} (${photo.title})`, !reportError, summarizeError(reportError));
    if (!reportError) created.push({ ...photo, report, item: null, ownerId, index: i, imageUrl: pub.publicUrl });
  }

  // 2. Items must not be published before frontdesk confirmation.
  const reportIds = created.map((c) => c.report.id);
  const { data: unpublished, error: unpublishedError } = await anon
    .from('items')
    .select('id, source_report_id, diterima_di_pos, status')
    .eq('diterima_di_pos', true)
    .in('source_report_id', reportIds);
  check(
    'Katalog belum menampilkan temuan sebelum konfirmasi fisik',
    !unpublishedError && (unpublished?.length ?? 0) === 0,
    `${unpublished?.length ?? 0} item terlihat`
  );

  const { data: rawUnpublished, error: rawUnpublishedError } = await anon
    .from('items')
    .select('id, source_report_id, diterima_di_pos')
    .in('source_report_id', reportIds);
  check(
    'API langsung tidak membocorkan item yang belum diterima',
    !!rawUnpublishedError || (rawUnpublished?.length ?? 0) === 0,
    rawUnpublishedError ? summarizeError(rawUnpublishedError) : `${rawUnpublished?.length ?? 0} item mentah terbaca`
  );

  const { data: preItems } = await service
    .from('items')
    .select('id, source_report_id, status, diterima_di_pos')
    .in('source_report_id', reportIds);
  check('Trigger membuat item "Menunggu Penyerahan" untuk tiap temuan', (preItems?.length ?? 0) === created.length, `${preItems?.length ?? 0}/${created.length}`);
  check(
    'Item baru belum bertanda diterima_di_pos',
    (preItems ?? []).every((item) => item.diterima_di_pos !== true),
    JSON.stringify((preItems ?? []).map((i) => i.diterima_di_pos))
  );

  // 3. Admin publishes all found reports (same writes as updateReportStatusAction).
  for (const entry of created) {
    const { error: updateError } = await admin
      .from('reports')
      .update({ status: 'ditemukan', diterima_di_pos: true })
      .eq('id', entry.report.id);
    if (updateError) check(`Publikasikan temuan ${entry.title}`, false, summarizeError(updateError));
  }
  const { data: itemRows, error: itemError } = await service
    .from('items')
    .select('id, title, status, diterima_di_pos, source_report_id')
    .in('source_report_id', reportIds)
    .order('found_at', { ascending: true });
  check('Semua item temuan diterima di pos', !itemError && (itemRows?.length ?? 0) === created.length && itemRows.every((i) => i.diterima_di_pos === true), summarizeError(itemError));
  for (const entry of created) {
    entry.item = itemRows?.find((row) => row.source_report_id === entry.report.id) ?? null;
  }

  // The admin UI writes this event when confirming physical receipt.
  const { error: receiptEventError } = await service.from('report_events').insert(
    created.map((entry) => ({
      report_id: entry.report.id,
      title: 'Barang diterima di pos/penyimpanan',
      description: 'Barang telah diterima petugas dan siap tampil di katalog untuk diklaim. Disimpan di Resepsionis / Lobi Utama VINIX7.',
      created_by: adminUser.id,
    }))
  );
  check('Timeline temuan mencatat penerimaan fisik barang', !receiptEventError, summarizeError(receiptEventError));

  const { data: catalog, error: catalogError } = await anon
    .from('items')
    .select('id, title, status, diterima_di_pos')
    .eq('diterima_di_pos', true)
    .neq('status', 'Klaim Disetujui')
    .neq('status', 'Selesai')
    .in('id', created.map((c) => c.item?.id).filter(Boolean));
  check('10 barang temuan tampil di katalog setelah approval admin', !catalogError && catalog?.length === 10, `${catalog?.length ?? 0}/10`);

  // 3b. Separate flow items so the 10 photo items stay available in the catalog
  // after the claim approval/handover tests finish.
  const flowItems = [];
  for (let i = 0; i < 2; i++) {
    const { data: flowReport, error: flowError } = await karyawan
      .from('reports')
      .insert({
        report_code: `${runTag}-C${String(i + 1).padStart(2, '0')}`,
        user_id: karyawanUser.id,
        type: 'temuan',
        item_title: `[E2E-FLOW] Barang uji ${i === 0 ? 'persetujuan & serah terima' : 'penolakan klaim'}`,
        category: 'Lainnya',
        location: 'Lobby / Resepsionis Utama',
        incident_at: new Date(Date.now() - (i + 2) * 60 * 60 * 1000).toISOString(),
        public_description: 'Barang fiktif untuk menguji alur klaim. Tidak ditampilkan sebagai data katalog akhir.',
        private_description: `CIRI RAHASIA FLOW ${i + 1}`,
        image_url: created[0].imageUrl,
        contact_phone: '081234567890',
        status: 'aktif'
      })
      .select('id, report_code')
      .single();
    check(`Buat item alur klaim ${i + 1}`, !flowError, summarizeError(flowError));
    if (!flowError) flowItems.push({ report: flowReport, item: null });
  }

  for (const entry of flowItems) {
    await admin.from('reports').update({ status: 'ditemukan', diterima_di_pos: true }).eq('id', entry.report.id);
  }
  const flowReportIds = flowItems.map((entry) => entry.report.id);
  const { data: flowItemRows } = await service
    .from('items')
    .select('id, source_report_id, status')
    .in('source_report_id', flowReportIds);
  for (const entry of flowItems) {
    entry.item = flowItemRows?.find((row) => row.source_report_id === entry.report.id) ?? null;
  }
  check('Item alur klaim siap diuji', flowItems.length === 2 && flowItems.every((entry) => entry.item?.id), `${flowItems.filter((e) => e.item?.id).length}/2`);

  // 4. Karyawan submits a claim on the dedicated flow item.
  const claimTarget = flowItems[0];
  const { data: claim, error: claimError } = await karyawan
    .from('claims')
    .insert({
      item_id: claimTarget.item.id,
      user_id: karyawanUser.id,
      private_answers: `CIRI RAHASIA UJI 1: ada goresan kecil di gagang. ${runTag}`,
      contact_phone: '081234567890',
      ticket_code: ticketCode(1)
    })
    .select('id, ticket_code, status')
    .single();
  check('Karyawan dapat mengajukan klaim', !claimError && claim?.status === 'diajukan', summarizeError(claimError));

  const { data: afterClaimItem } = await service.from('items').select('status').eq('id', claimTarget.item.id).single();
  const { data: afterClaimReport } = await service.from('reports').select('status').eq('id', claimTarget.report.id).single();
  check('Klaim mengubah status item menjadi "Menunggu Verifikasi"', afterClaimItem?.status === 'Menunggu Verifikasi', afterClaimItem?.status);
  check('Klaim mengubah status laporan temuan menjadi "klaim"', afterClaimReport?.status === 'klaim', afterClaimReport?.status);

  const { data: claimEvent } = await service
    .from('report_events')
    .select('title')
    .eq('report_id', claimTarget.report.id)
    .ilike('title', '%Klaim diajukan%');
  check('Event "Klaim diajukan" tercatat di laporan temuan', (claimEvent?.length ?? 0) > 0, `${claimEvent?.length ?? 0} event`);

  // 5. Duplicate claim guard (same check as submitItemClaim).
  const { data: activeClaim } = await karyawan
    .from('claims')
    .select('id, ticket_code')
    .eq('item_id', claimTarget.item.id)
    .eq('user_id', karyawanUser.id)
    .in('status', ['diajukan', 'ditinjau', 'disetujui'])
    .maybeSingle();
  check('Guard aplikasi mendeteksi klaim aktif yang sudah ada', Boolean(activeClaim), activeClaim ? `klaim aktif ${activeClaim.ticket_code}` : 'tidak terdeteksi');

  // 6. RLS negatives.
  const { data: claimUpdate, error: claimUpdateError } = await karyawan
    .from('claims')
    .update({ status: 'disetujui' })
    .eq('id', claim.id)
    .select('id');
  check('Karyawan tidak dapat mengubah status klaim', !!claimUpdateError || (claimUpdate?.length ?? 0) === 0, summarizeError(claimUpdateError) || `${claimUpdate?.length ?? 0} baris`);

  const { data: itemUpdate, error: itemUpdateError } = await karyawan
    .from('items')
    .update({ status: 'Selesai' })
    .eq('id', claimTarget.item.id)
    .select('id');
  check('Karyawan tidak dapat mengubah status item', !!itemUpdateError || (itemUpdate?.length ?? 0) === 0, summarizeError(itemUpdateError) || `${itemUpdate?.length ?? 0} baris`);

  const { data: ownReportUpdate, error: ownReportUpdateError } = await karyawan
    .from('reports')
    .update({ status: 'selesai' })
    .eq('id', created[1].report.id)
    .select('id, status');
  check('Karyawan tidak dapat menutup laporannya sendiri (selesai)', !!ownReportUpdateError || (ownReportUpdate?.length ?? 0) === 0, ownReportUpdateError ? summarizeError(ownReportUpdateError) : `${ownReportUpdate?.length ?? 0} baris diubah (harus 0)`);
  if (ownReportUpdate?.length) {
    await service.from('reports').update({ status: 'ditemukan' }).eq('id', created[1].report.id);
  }

  const { data: anonReports, error: anonReportsError } = await anon.from('reports').select('id').in('id', reportIds.slice(0, 3));
  check('Anonim tidak dapat membaca laporan pengguna', !anonReportsError && (anonReports?.length ?? 0) === 0, summarizeError(anonReportsError) || `${anonReports?.length ?? 0} baris`);

  const adminReportId = created[9].report.id; // owned by admin
  const { data: crossReports, error: crossReportsError } = await karyawan.from('reports').select('id').eq('id', adminReportId);
  check('Karyawan tidak dapat membaca laporan milik admin', !crossReportsError && (crossReports?.length ?? 0) === 0, summarizeError(crossReportsError) || `${crossReports?.length ?? 0} baris`);

  const { data: privateNotes, error: privateNotesError } = await anon
    .from('items')
    .select('id, private_notes')
    .in('id', created.map((c) => c.item?.id).filter(Boolean))
    .limit(3);
  const leaked = (privateNotes ?? []).filter((row) => row.private_notes);
  check('Catatan privat barang tidak terekspos ke anonim', !!privateNotesError || leaked.length === 0, privateNotesError ? 'kolom privat sudah dihapus dari tabel items' : `${leaked.length} catatan privat terbaca (celah)`);

  // 7. Admin approves the claim (same writes as updateClaimAction).
  const pickup = 'Resepsionis / Lobi Utama VINIX7';
  const { error: approveError } = await admin
    .from('claims')
    .update({ status: 'disetujui', pickup_location: pickup, updated_at: new Date().toISOString() })
    .eq('id', claim.id);
  check('Admin dapat menyetujui klaim', !approveError, summarizeError(approveError));

  // Emulate the server action's compatibility step for the old trigger:
  // keep the item at "Klaim Disetujui" instead of the trigger's "Selesai".
  const { data: itemAfterApprove } = await service.from('items').select('status').eq('id', claimTarget.item.id).single();
  if (itemAfterApprove?.status === 'Selesai') {
    await service.from('items').update({ status: 'Klaim Disetujui' }).eq('id', claimTarget.item.id);
  }

  const { data: approvedClaim } = await service.from('claims').select('status, pickup_location, pickup_at, approved_at').eq('id', claim.id).single();
  const { data: approvedItem } = await service.from('items').select('status, diterima_di_pos').eq('id', claimTarget.item.id).single();
  const { data: approvedReport } = await service.from('reports').select('status').eq('id', claimTarget.report.id).single();
  check('Klaim tersimpan sebagai disetujui + lokasi pengambilan', approvedClaim?.status === 'disetujui' && approvedClaim?.pickup_location === pickup, JSON.stringify(approvedClaim));
  check('Klaim disetujui belum ditandai serah terima', approvedClaim?.pickup_at === null, String(approvedClaim?.pickup_at));
  check('Waktu persetujuan klaim tersimpan terpisah', Boolean(approvedClaim?.approved_at), String(approvedClaim?.approved_at));
  check('Item menjadi "Klaim Disetujui" setelah approval', approvedItem?.status === 'Klaim Disetujui', approvedItem?.status);
  const { data: catalogAfterApproval } = await anon
    .from('items')
    .select('id, status')
    .in('id', [...created.map((c) => c.item?.id).filter(Boolean), claimTarget.item.id])
    .neq('status', 'Klaim Disetujui')
    .neq('status', 'Selesai');
  check('Katalog tidak lagi memuat item dengan klaim disetujui', !catalogAfterApproval?.some((row) => row.id === claimTarget.item.id), `${catalogAfterApproval?.length ?? 0} item tersisa`);

  // Approval must keep the report open until handover.
  check(
    'Laporan temuan tetap berstatus "klaim" setelah approval, sampai serah terima',
    approvedReport?.status === 'klaim',
    `status aktual: ${approvedReport?.status}`
  );

  const { data: approvalNotification } = await service
    .from('notifications')
    .select('title, body, link')
    .eq('user_id', karyawanUser.id)
    .ilike('title', '%disetujui%')
    .order('created_at', { ascending: false })
    .limit(1);
  check('Notifikasi persetujuan terkirim ke pemohon klaim', (approvalNotification?.length ?? 0) > 0, approvalNotification?.[0]?.title ?? 'tidak ada');

  // 7b. Admin marks the handover (same writes as markClaimHandedOverAction).
  const handedOverAt = new Date().toISOString();
  await service.from('claims').update({ pickup_at: handedOverAt, updated_at: handedOverAt }).eq('id', claim.id);
  await service.from('items').update({ status: 'Selesai' }).eq('id', claimTarget.item.id);
  await service.from('reports').update({ status: 'selesai', updated_at: handedOverAt }).eq('id', claimTarget.report.id);
  await service.from('report_events').insert({
    report_id: claimTarget.report.id,
    title: 'Barang telah diserahkan kepada pemilik',
    description: `Serah terima tiket ${claim.ticket_code} selesai. Lokasi: ${pickup}.`,
    created_by: adminUser.id,
  });
  await service.from('notifications').insert({
    user_id: karyawanUser.id,
    title: 'Barang sudah diserahkan',
    body: `Tiket ${claim.ticket_code}: barang telah diserahkan kepada pemohon.`,
    type: 'pickup',
    link: `/lacak?ticket=${claim.ticket_code}`,
  });

  const { data: handedClaim } = await service.from('claims').select('status, pickup_at, approved_at').eq('id', claim.id).single();
  const { data: handedItem } = await service.from('items').select('status').eq('id', claimTarget.item.id).single();
  const { data: handedReport } = await service.from('reports').select('status').eq('id', claimTarget.report.id).single();
  check('Serah terima mencatat waktu pengambilan pada klaim', Boolean(handedClaim?.pickup_at), String(handedClaim?.pickup_at));
  check(
    'Waktu persetujuan tidak tertimpa saat serah terima',
    Boolean(handedClaim?.approved_at) && handedClaim?.approved_at === approvedClaim?.approved_at,
    `${handedClaim?.approved_at}`
  );
  check('Item menjadi "Selesai" setelah serah terima', handedItem?.status === 'Selesai', handedItem?.status);
  check('Laporan temuan menjadi "selesai" setelah serah terima', handedReport?.status === 'selesai', handedReport?.status);

  const { data: handoverEvent } = await service
    .from('report_events')
    .select('title')
    .eq('report_id', claimTarget.report.id)
    .ilike('title', '%diserahkan%');
  check('Event serah terima tercatat di timeline laporan', (handoverEvent?.length ?? 0) > 0, `${handoverEvent?.length ?? 0} event`);

  const { data: handoverNotification } = await service
    .from('notifications')
    .select('title')
    .eq('user_id', karyawanUser.id)
    .eq('type', 'pickup')
    .order('created_at', { ascending: false })
    .limit(1);
  check('Notifikasi serah terima terkirim ke pemohon', (handoverNotification?.length ?? 0) > 0, handoverNotification?.[0]?.title ?? 'tidak ada');

  // 8. Admin rejects a second claim.
  const rejectTarget = flowItems[1];
  const { data: rejectClaim, error: rejectClaimError } = await karyawan
    .from('claims')
    .insert({
      item_id: rejectTarget.item.id,
      user_id: karyawanUser.id,
      private_answers: `CIRI RAHASIA UJI 3: warna gelap. ${runTag}`,
      contact_phone: '081234567890',
      ticket_code: ticketCode(2)
    })
    .select('id')
    .single();
  check('Klaim kedua dapat diajukan untuk pengujian penolakan', !rejectClaimError, summarizeError(rejectClaimError));
  if (rejectClaim) {
    const { error: rejectError } = await admin
      .from('claims')
      .update({ status: 'ditolak', updated_at: new Date().toISOString() })
      .eq('id', rejectClaim.id);
    const { data: rejectedItem } = await service.from('items').select('status').eq('id', rejectTarget.item.id).single();
    const { data: rejectedReport } = await service.from('reports').select('status').eq('id', rejectTarget.report.id).single();
    check('Admin dapat menolak klaim', !rejectError, summarizeError(rejectError));
    check('Item kembali "Ditemukan" setelah klaim ditolak', rejectedItem?.status === 'Ditemukan', rejectedItem?.status);
    check('Laporan temuan kembali "ditemukan" setelah klaim ditolak', rejectedReport?.status === 'ditemukan', rejectedReport?.status);
  }

  // 9. Lost-report flow.
  const { data: lostReport, error: lostError } = await karyawan
    .from('reports')
    .insert({
      report_code: `${runTag}-L01`,
      user_id: karyawanUser.id,
      type: 'hilang',
      item_title: '[E2E] Dompet hilang',
      category: 'Dokumen',
      location: 'Ruang Meeting',
      incident_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      public_description: 'Dompet kulit hitam hilang saat meeting.',
      private_description: 'Isi: KTP dan kartu akses.',
      contact_phone: '081234567890',
      status: 'aktif'
    })
    .select('id')
    .single();
  check('Karyawan dapat membuat laporan kehilangan', !lostError, summarizeError(lostError));

  if (lostReport) {
    const { data: lostItems } = await service.from('items').select('id').eq('source_report_id', lostReport.id);
    check('Laporan kehilangan tidak membuat item katalog', (lostItems?.length ?? 0) === 0, `${lostItems?.length ?? 0} item`);

    await admin.from('reports').update({ status: 'ditemukan' }).eq('id', lostReport.id);
    await service.from('report_events').insert({
      report_id: lostReport.id,
      title: 'Barang ditemukan',
      description: 'Barang yang sesuai dengan laporan kehilangan telah ditemukan. Petugas akan menghubungi pelapor untuk verifikasi kepemilikan.',
      created_by: adminUser.id,
    });
    const { data: lostFound } = await service.from('reports').select('status').eq('id', lostReport.id).single();
    check('Admin dapat menandai laporan hilang sebagai ditemukan', lostFound?.status === 'ditemukan', lostFound?.status);

    await admin.from('reports').update({ status: 'selesai' }).eq('id', lostReport.id);
    await service.from('report_events').insert({
      report_id: lostReport.id,
      title: 'Barang berhasil diverifikasi dan diserahkan',
      description: 'Verifikasi identitas dan ciri kepemilikan berhasil. Barang telah diserahkan kembali kepada pemilik.',
      created_by: adminUser.id,
    });
    const { data: lostDone } = await service.from('reports').select('status').eq('id', lostReport.id).single();
    check('Admin dapat menutup laporan hilang setelah serah terima', lostDone?.status === 'selesai', lostDone?.status);

    const { data: lostEvents } = await service
      .from('report_events')
      .select('title')
      .eq('report_id', lostReport.id)
      .order('created_at', { ascending: true });
    check('Timeline laporan hilang mencatat dibuat + perubahan status', (lostEvents?.length ?? 0) >= 3, `${lostEvents?.length ?? 0} event: ${(lostEvents ?? []).map((e) => e.title).join(' -> ')}`);

    const { data: lostNotifications } = await service
      .from('notifications')
      .select('title')
      .eq('user_id', karyawanUser.id)
      .eq('type', 'report')
      .order('created_at', { ascending: false })
      .limit(3);
    check('Notifikasi perubahan status laporan hilang terkirim', (lostNotifications?.length ?? 0) > 0, `${lostNotifications?.length ?? 0} notifikasi`);
  }

  // 10. Clean up temporary flow data so only the 10 photo items remain.
  const cleanupReportIds = [...flowReportIds, lostReport?.id].filter(Boolean);
  if (cleanupReportIds.length > 0) {
    await service.from('reports').delete().in('id', cleanupReportIds);
  }
  const cleanupLinks = [ticketCode(1), ticketCode(2)].map((code) => `/lacak?ticket=${code}`);
  if (lostReport?.id) cleanupLinks.push(`/lacak?report=${lostReport.id}`);
  await service.from('notifications').delete().in('link', cleanupLinks);
  const { data: leftoverFlowItems } = await service
    .from('items')
    .select('id')
    .in('source_report_id', flowReportIds);
  check('Data alur klaim sementara dibersihkan', (leftoverFlowItems?.length ?? 0) === 0, `${leftoverFlowItems?.length ?? 0} item tersisa`);

  // 11. Final count for manual UI testing.
  const { data: finalCatalog } = await anon
    .from('items')
    .select('id, title, status')
    .eq('diterima_di_pos', true)
    .neq('status', 'Klaim Disetujui')
    .neq('status', 'Selesai')
    .like('title', '[E2E]%');
  console.log(`\nKatalog uji tersisa untuk verifikasi UI: ${finalCatalog?.length ?? 0} item`);
  for (const row of finalCatalog ?? []) console.log(`  - ${row.title} (${row.status})`);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(`\nSUMMARY: ${passed} PASS, ${failed} FAIL, ${results.length} checks`);
  if (failed) {
    console.log('\nFAILED CHECKS:');
    for (const r of results.filter((x) => !x.pass)) console.log(`  - ${r.name} :: ${r.detail}`);
  }

  fs.writeFileSync('e2e-results.json', JSON.stringify({ runTag, results }, null, 2));
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('E2E crashed:', error);
  process.exit(2);
});
