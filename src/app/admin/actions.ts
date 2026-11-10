'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createNotification } from '@/lib/supabase/server-notifications';
import type { FilterStatus, UpdateClaimInput, BulkUpdateInput, Claim, LostReport, ReportStatus, FilterReportStatus } from '@/types/claims';

const updateClaimSchema = z.object({
  claimId: z.string().uuid(),
  status: z.enum(['ditinjau', 'disetujui', 'ditolak']),
  pickupLocation: z.string().min(1).max(200).optional(),
  rejectReason: z.string().max(300).optional(),
});

const bulkUpdateSchema = z.object({
  claimIds: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(['ditinjau', 'disetujui', 'ditolak']),
  pickupLocation: z.string().min(1).max(200).optional(),
});

const handoverClaimSchema = z.object({
  claimId: z.string().uuid(),
});

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(['draf', 'aktif', 'ditemukan', 'klaim', 'selesai']),
  finderName: z.string().max(100).optional(),
  foundLocation: z.string().max(200).optional(),
  storageLocation: z.string().max(200).optional(),
  note: z.string().max(300).optional(),
});

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role?.toLowerCase();
  if (role !== 'admin') {
    throw new Error('FORBIDDEN');
  }

  return { supabase, user };
}
export async function updateClaimAction(input: UpdateClaimInput): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const parsed = updateClaimSchema.parse(input);

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id, status, item_id, report_id, ticket_code, pickup_location, user_id')
      .eq('id', parsed.claimId)
      .single();

    if (claimError || !claim) {
      return { success: false, error: 'Klaim tidak ditemukan', code: 'NOT_FOUND' };
    }

    if (claim.status === 'disetujui') {
      return { success: false, error: 'Klaim sudah disetujui dan tidak dapat diubah kembali', code: 'INVALID_TRANSITION' };
    }

    if (claim.status === 'ditolak' && parsed.status !== 'ditinjau') {
      return { success: false, error: 'Klaim yang ditolak hanya dapat dipulihkan ke status "Ditinjau"', code: 'INVALID_TRANSITION' };
    }

    if (parsed.status === 'disetujui' && !parsed.pickupLocation) {
      return { success: false, error: 'Lokasi pengambilan wajib diisi untuk persetujuan', code: 'MISSING_PICKUP' };
    }

    const updateData: Record<string, unknown> = {
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };

    if (parsed.pickupLocation) {
      updateData.pickup_location = parsed.pickupLocation;
    }

    const { error: updateError } = await supabase
      .from('claims')
      .update(updateData)
      .eq('id', parsed.claimId);

    if (updateError) {
      console.error('Update claim error:', updateError);
      return { success: false, error: 'Gagal memperbarui klaim', code: 'UPDATE_FAILED' };
    }

    // Trigger lama menutup item menjadi "Selesai" saat klaim disetujui.
    // Kembalikan ke "Klaim Disetujui" agar status serah terima terpisah dari persetujuan.
    if (parsed.status === 'disetujui') {
      const { data: approvedItem } = await supabase
        .from('items')
        .select('status')
        .eq('id', claim.item_id)
        .maybeSingle();
      if (approvedItem?.status === 'Selesai') {
        await supabase
          .from('items')
          .update({ status: 'Klaim Disetujui' })
          .eq('id', claim.item_id);
      }
    }

    // Kirim notifikasi ke pemilik klaim dan pemilik barang temuan (jika berbeda)
    try {
      const claimOwnerId = (claim as { user_id?: string }).user_id;
      const statusLabel = parsed.status === 'disetujui' ? 'disetujui' : parsed.status === 'ditolak' ? 'ditolak' : 'diperbarui';

      const claimTicketLink = `/lacak?ticket=${claim.ticket_code}`;

      if (claimOwnerId) {
        await createNotification({
          userId: claimOwnerId,
          title: parsed.status === 'disetujui' ? 'Klaim disetujui' : parsed.status === 'ditolak' ? 'Klaim ditolak' : 'Status klaim diperbarui',
          body: `Status klaim Anda berubah menjadi ${statusLabel}${parsed.pickupLocation ? ', lokasi pengambilan: ' + parsed.pickupLocation : ''}`,
          type: 'claim',
          link: claimTicketLink,
        });
      }

      // Notifikasi juga ke pemilik barang temuan jika klaim adalah pada barang temuan dan pemilik berbeda
      if (claim.item_id && claimOwnerId) {
        const { data: item } = await supabase
          .from('items')
          .select('user_id, source_report_id')
          .eq('id', claim.item_id)
          .single();

        if (item?.user_id && item.user_id !== claimOwnerId) {
          await createNotification({
            userId: item.user_id,
            title: 'Ada klaim pada barang temuan Anda',
            body: `Tiket ${claim.ticket_code}: status klaim berubah menjadi ${statusLabel}${parsed.pickupLocation ? ', lokasi pengambilan: ' + parsed.pickupLocation : ''}`,
            type: 'claim',
            link: claimTicketLink,
          });
        }
      }
    } catch (notifyError) {
      console.error('Send notification error:', notifyError);
      // Jangan gagalkan update claim karena notifikasi gagal
    }

    if (claim.report_id) {
      let title = 'Status klaim diperbarui oleh petugas';
      let desc = `Status berubah dari ${claim.status} menjadi ${parsed.status}${parsed.pickupLocation ? `, lokasi: ${parsed.pickupLocation}` : ''}`;

      if (parsed.status === 'ditolak') {
        title = 'Klaim ditolak oleh petugas';
        desc = parsed.rejectReason ? `Alasan penolakan: ${parsed.rejectReason}` : 'Ciri rahasia yang diajukan belum sesuai dengan barang temuan.';
      } else if (claim.status === 'ditolak' && parsed.status === 'ditinjau') {
        title = 'Klaim dibuka kembali untuk peninjauan ulang';
        desc = 'Petugas membuka kembali tiket klaim ini untuk verifikasi ulang.';
      }

      await supabase.from('report_events').insert({
        report_id: claim.report_id,
        title,
        description: desc,
        created_by: user.id,
      });
    }

    revalidatePath('/admin');
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Data tidak valid', code: 'VALIDATION_ERROR' };
    }
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak: hanya untuk petugas', code: 'FORBIDDEN' };
    }
    console.error('updateClaimAction error:', error);
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function bulkUpdateClaimsAction(input: BulkUpdateInput): Promise<ActionResult<{ updated: number }>> {
  try {
    const { supabase, user } = await requireAdmin();
    const parsed = bulkUpdateSchema.parse(input);

    if (parsed.status === 'disetujui' && !parsed.pickupLocation) {
      return { success: false, error: 'Lokasi pengambilan wajib diisi untuk persetujuan massal', code: 'MISSING_PICKUP' };
    }

    const { data: claims, error: fetchError } = await supabase
      .from('claims')
      .select('id, status, item_id, report_id, ticket_code, user_id')
      .in('id', parsed.claimIds);

    if (fetchError) {
      return { success: false, error: 'Gagal memuat klaim', code: 'FETCH_FAILED' };
    }

    if (!claims || claims.length === 0) {
      return { success: false, error: 'Tidak ada klaim yang dipilih', code: 'EMPTY_SELECTION' };
    }

    const processableClaims = claims.filter(c => c.status === 'diajukan' || c.status === 'ditinjau');
    
    if (processableClaims.length === 0) {
      return { success: false, error: 'Semua klaim terpilih sudah diproses', code: 'ALREADY_PROCESSED' };
    }

    const updateData: Record<string, unknown> = {
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };

    if (parsed.pickupLocation) {
      updateData.pickup_location = parsed.pickupLocation;
    }

    const { error: updateError } = await supabase
      .from('claims')
      .update(updateData)
      .in('id', processableClaims.map(c => c.id));

    if (updateError) {
      console.error('Bulk update error:', updateError);
      return { success: false, error: 'Gagal memperbarui klaim', code: 'UPDATE_FAILED' };
    }

    if (parsed.status === 'disetujui') {
      const approvedItemIds = [...new Set(processableClaims.map((c) => c.item_id).filter(Boolean))] as string[];
      if (approvedItemIds.length > 0) {
        const { data: approvedItems } = await supabase
          .from('items')
          .select('id, status')
          .in('id', approvedItemIds);
        const itemsToRestore = (approvedItems ?? [])
          .filter((item) => item.status === 'Selesai')
          .map((item) => item.id);
        if (itemsToRestore.length > 0) {
          await supabase
            .from('items')
            .update({ status: 'Klaim Disetujui' })
            .in('id', itemsToRestore);
        }
      }
    }

    const events = processableClaims
      .filter(claim => Boolean(claim.report_id))
      .map(claim => ({
        report_id: claim.report_id as string,
        title: 'Status klaim diperbarui oleh petugas (massal)',
        description: `Status berubah dari ${claim.status} menjadi ${parsed.status}${parsed.pickupLocation ? `, lokasi: ${parsed.pickupLocation}` : ''}`,
        created_by: user.id,
      }));

    if (events.length > 0) {
      await supabase.from('report_events').insert(events);
    }

    // Kirim notifikasi per klaim (link spesifik, sama seperti single update)
    try {
      const statusLabel = parsed.status === 'disetujui' ? 'disetujui' : parsed.status === 'ditolak' ? 'ditolak' : 'diperbarui';
      // Batch lookup items untuk notifikasi pemilik barang temuan
      const itemIds = [...new Set(processableClaims.map((c) => c.item_id).filter(Boolean))] as string[];
      const itemMap: Record<string, { user_id: string; source_report_id: string | null }> = {};
      if (itemIds.length > 0) {
        const { data: items } = await supabase
          .from('items')
          .select('id, user_id, source_report_id')
          .in('id', itemIds);
        if (items) {
          for (const it of items as Array<{ id: string; user_id: string; source_report_id: string | null }>) {
            itemMap[it.id] = { user_id: it.user_id, source_report_id: it.source_report_id };
          }
        }
      }
      for (const c of processableClaims) {
        const claimOwnerId = (c as { user_id?: string }).user_id;
        if (claimOwnerId && (c as { ticket_code?: string }).ticket_code) {
          await createNotification({
            userId: claimOwnerId,
            title: parsed.status === 'disetujui' ? 'Klaim disetujui' : parsed.status === 'ditolak' ? 'Klaim ditolak' : 'Status klaim diperbarui',
            body: `Status klaim Anda berubah menjadi ${statusLabel}${parsed.pickupLocation ? ', lokasi pengambilan: ' + parsed.pickupLocation : ''}`,
            type: 'claim',
            link: `/lacak?ticket=${(c as { ticket_code?: string }).ticket_code}`,
          });
        }
        const item = c.item_id ? itemMap[c.item_id] : undefined;
        if (item?.user_id && claimOwnerId && item.user_id !== claimOwnerId && (c as { ticket_code?: string }).ticket_code) {
          await createNotification({
            userId: item.user_id,
            title: 'Ada klaim pada barang temuan Anda',
            body: `Tiket ${(c as { ticket_code?: string }).ticket_code}: status klaim berubah menjadi ${statusLabel}${parsed.pickupLocation ? ', lokasi pengambilan: ' + parsed.pickupLocation : ''}`,
            type: 'claim',
            link: `/lacak?ticket=${(c as { ticket_code?: string }).ticket_code}`,
          });
        }
      }
    } catch (notifyError) {
      console.error('Send bulk notification error:', notifyError);
    }

    revalidatePath('/admin');
    return { success: true, data: { updated: processableClaims.length } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Data tidak valid', code: 'VALIDATION_ERROR' };
    }
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak: hanya untuk petugas', code: 'FORBIDDEN' };
    }
    console.error('bulkUpdateClaimsAction error:', error);
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function markClaimHandedOverAction(input: { claimId: string }): Promise<ActionResult<{ handedOverAt: string }>> {
  try {
    const { supabase, user } = await requireAdmin();
    const parsed = handoverClaimSchema.parse(input);

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('id, status, item_id, report_id, ticket_code, user_id, pickup_at, pickup_location')
      .eq('id', parsed.claimId)
      .single();

    if (claimError || !claim) {
      return { success: false, error: 'Klaim tidak ditemukan', code: 'NOT_FOUND' };
    }

    if (claim.status !== 'disetujui') {
      return { success: false, error: 'Hanya klaim yang disetujui yang dapat ditandai sudah diambil', code: 'INVALID_TRANSITION' };
    }

    const handedOverAt = claim.pickup_at ?? new Date().toISOString();

    if (!claim.pickup_at) {
      const { error: updateClaimError } = await supabase
        .from('claims')
        .update({ pickup_at: handedOverAt, updated_at: handedOverAt })
        .eq('id', claim.id);
      if (updateClaimError) {
        console.error('Mark handover claim error:', updateClaimError);
        return { success: false, error: 'Gagal mencatat serah terima', code: 'UPDATE_FAILED' };
      }
    }

    const { data: item } = await supabase
      .from('items')
      .select('id, source_report_id, status')
      .eq('id', claim.item_id)
      .maybeSingle();

    if (item) {
      await supabase.from('items').update({ status: 'Selesai' }).eq('id', item.id);

      if (item.source_report_id) {
        await supabase
          .from('reports')
          .update({ status: 'selesai', updated_at: handedOverAt })
          .eq('id', item.source_report_id);

        await supabase.from('report_events').insert({
          report_id: item.source_report_id,
          title: 'Barang telah diserahkan kepada pemilik',
          description: `Serah terima tiket ${claim.ticket_code} selesai. Lokasi: ${claim.pickup_location ?? '-'}.`,
          created_by: user.id,
        });
      }
    }

    if (claim.report_id && claim.report_id !== item?.source_report_id) {
      await supabase.from('report_events').insert({
        report_id: claim.report_id,
        title: 'Barang telah diserahkan kepada pemilik',
        description: `Serah terima tiket ${claim.ticket_code} selesai. Lokasi: ${claim.pickup_location ?? '-'}.`,
        created_by: user.id,
      });
      await supabase.from('reports').update({ status: 'selesai' }).eq('id', claim.report_id);
    }

    try {
      await createNotification({
        userId: claim.user_id,
        title: 'Barang sudah diserahkan',
        body: `Tiket ${claim.ticket_code}: barang telah diserahkan kepada pemohon. Simpan tiket ini sebagai bukti pengambilan.`,
        type: 'pickup',
        link: `/lacak?ticket=${claim.ticket_code}`,
      });
    } catch (notifyError) {
      console.error('Send handover notification error:', notifyError);
    }

    revalidatePath('/admin');
    revalidatePath('/lacak');
    revalidatePath('/laporan-saya');
    return { success: true, data: { handedOverAt } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Data tidak valid', code: 'VALIDATION_ERROR' };
    }
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak: hanya untuk petugas', code: 'FORBIDDEN' };
    }
    console.error('markClaimHandedOverAction error:', error);
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function fetchClaimsAction(
  cursor?: string,
  limit = 20,
  statusFilter?: FilterStatus,
  searchQuery?: string
): Promise<ActionResult<{ claims: unknown[]; total: number; hasMore: boolean; nextCursor: string | null }>> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    let query = supabase
      .from('claims')
      .select(`
        id,
        item_id,
        report_id,
        user_id,
        private_answers,
        contact_phone,
        status,
        ticket_code,
        pickup_location,
        pickup_at,
        created_at,
        updated_at,
        item:items!item_id(id, title, location, image_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    if (statusFilter && statusFilter !== 'semua') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`ticket_code.ilike.%${q}%,contact_phone.ilike.%${q}%`);
    }

    query = query.limit(limit + 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Fetch claims error:', error);
      return { success: false, error: 'Gagal memuat data klaim', code: 'FETCH_FAILED' };
    }

    let claims = (data || []) as unknown as Claim[];

    // Fetch profiles separately — claims.user_id FK points to auth.users (cross-schema),
    // so PostgREST cannot auto-join to public.profiles. We do it manually.
    const userIds = [...new Set(claims.map((c) => c.user_id).filter(Boolean))];
    const profileMap: Record<string, { id: string; full_name: string; phone: string | null; department: string | null; employee_id: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone, department, employee_id')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles as Array<{ id: string; full_name: string; phone: string | null; department: string | null; employee_id: string | null }>) {
          profileMap[p.id] = p;
        }
      }
    }

    // Merge claimant into each claim
    claims = claims.map((c) => ({
      ...c,
      claimant: profileMap[c.user_id] || null,
    }));

    // If client supplied a search query, also filter in-memory for item title or claimant name/ID
    if (searchQuery && searchQuery.trim()) {
      const lower = searchQuery.trim().toLowerCase();
      claims = claims.filter((c) => {
        const itemTitle = c.item?.title?.toLowerCase() || '';
        const claimantName = c.claimant?.full_name?.toLowerCase() || '';
        const employeeId = c.claimant?.employee_id?.toLowerCase() || '';
        const department = c.claimant?.department?.toLowerCase() || '';
        const ticketCode = c.ticket_code?.toLowerCase() || '';
        return itemTitle.includes(lower) || claimantName.includes(lower) || employeeId.includes(lower) || department.includes(lower) || ticketCode.includes(lower);
      });
    }

    const hasMore = claims.length > limit;
    const items = hasMore ? claims.slice(0, limit) : claims;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    return { success: true, data: { claims: items, total: count || 0, hasMore, nextCursor } };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak: hanya untuk petugas', code: 'FORBIDDEN' };
    }
    console.error('fetchClaimsAction error:', error);
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function getAdminTabCountsAction(): Promise<ActionResult<{
  claims: number;
  lostReports: number;
  confirmations: number;
}>> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const [
      { count: claimsCount, error: claimsErr },
      { count: lostCount, error: lostErr },
      { count: confirmCount, error: confirmErr },
    ] = await Promise.all([
      supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'diajukan'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('type', 'hilang').eq('status', 'aktif'),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('type', 'temuan').eq('diterima_di_pos', false),
    ]);

    if (claimsErr || lostErr || confirmErr) {
      console.error('Error fetching admin tab counts:', { claimsErr, lostErr, confirmErr });
    }

    return {
      success: true,
      data: {
        claims: claimsCount ?? 0,
        lostReports: lostCount ?? 0,
        confirmations: confirmCount ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak', code: 'FORBIDDEN' };
    }
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function getClaimStatsAction(): Promise<ActionResult<{ total: number; pending: number; approved: number; rejected: number; underReview: number }>> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('claims')
      .select('status', { count: 'exact' });

    if (error) {
      return { success: false, error: 'Gagal memuat statistik', code: 'FETCH_FAILED' };
    }

    const claims = data || [];
    const stats = {
      total: claims.length,
      pending: claims.filter(c => c.status === 'diajukan').length,
      underReview: claims.filter(c => c.status === 'ditinjau').length,
      approved: claims.filter(c => c.status === 'disetujui').length,
      rejected: claims.filter(c => c.status === 'ditolak').length,
    };

    return { success: true, data: stats };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak', code: 'FORBIDDEN' };
    }
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function fetchLostReportsAction(
  cursor?: string,
  limit = 20,
  statusFilter?: FilterReportStatus,
  searchQuery?: string,
  typeFilter?: 'hilang' | 'temuan' | 'semua'
): Promise<ActionResult<{ reports: LostReport[]; total: number; hasMore: boolean; nextCursor: string | null }>> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    let query = supabase
      .from('reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (typeFilter && typeFilter !== 'semua') {
      query = query.eq('type', typeFilter);
    } else if (!typeFilter) {
      query = query.eq('type', 'hilang');
    }

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    if (statusFilter && statusFilter !== 'semua') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`report_code.ilike.%${q}%,item_title.ilike.%${q}%,location.ilike.%${q}%,contact_phone.ilike.%${q}%`);
    }

    query = query.limit(limit + 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Fetch lost reports error:', error);
      return { success: false, error: 'Gagal memuat data laporan kehilangan', code: 'FETCH_FAILED' };
    }

    let reports = (data || []) as unknown as LostReport[];

    // Fetch reporter profile
    const userIds = [...new Set(reports.map((r) => r.user_id).filter(Boolean))];
    const profileMap: Record<string, { id: string; full_name: string; phone: string | null; department: string | null; employee_id: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, phone, department, employee_id')
        .in('id', userIds);
      if (profiles) {
        for (const p of profiles as Array<{ id: string; full_name: string; phone: string | null; department: string | null; employee_id: string | null }>) {
          profileMap[p.id] = p;
        }
      }
    }

    reports = reports.map((r) => ({
      ...r,
      reporter: profileMap[r.user_id] || null,
    }));

    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, limit) : reports;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    return { success: true, data: { reports: items, total: count || 0, hasMore, nextCursor } };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak: hanya untuk petugas', code: 'FORBIDDEN' };
    }
    console.error('fetchLostReportsAction error:', error);
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}

export async function updateReportStatusAction(input: {
  reportId: string;
  status: ReportStatus;
  finderName?: string;
  foundLocation?: string;
  storageLocation?: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireAdmin();
    const parsed = updateReportSchema.parse(input);

    const { data: existingReport, error: reportLookupError } = await supabase
      .from('reports')
      .select('id, type, status, item_title, user_id')
      .eq('id', parsed.reportId)
      .single();

    if (reportLookupError || !existingReport) {
      console.error('Report lookup error:', reportLookupError);
      return { success: false, error: 'Laporan tidak ditemukan', code: 'NOT_FOUND' };
    }

    const reportUpdatePayload: {
      status: ReportStatus;
      updated_at: string;
      diterima_di_pos?: boolean;
    } = {
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };

    if (existingReport.type === 'temuan' && parsed.status === 'ditemukan') {
      reportUpdatePayload.diterima_di_pos = true;
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update(reportUpdatePayload)
      .eq('id', parsed.reportId);

    if (updateError) {
      console.error('Update report error:', updateError);
      return { success: false, error: 'Gagal memperbarui status laporan', code: 'UPDATE_FAILED' };
    }

    // Kirim notifikasi ke pemilik laporan
    try {
      const reportOwnerId = (existingReport as { user_id?: string }).user_id;
      const statusLabelMap: Record<string, string> = {
        aktif: 'aktif',
        ditemukan: 'ditemukan dan siap diverifikasi',
        selesai: 'selesai (diserahkan)',
        klaim: 'proses klaim',
        draf: 'draf',
      };

      if (reportOwnerId) {
        await createNotification({
          userId: reportOwnerId,
          title: 'Status laporan diperbarui',
          body: `Status laporan "${existingReport.item_title}" berubah menjadi ${statusLabelMap[parsed.status] ?? parsed.status}`,
          type: 'report',
          link: '/lacak?report=' + parsed.reportId,
        });
      }
    } catch (notifyError) {
      console.error('Send notification error:', notifyError);
      // Jangan gagalkan update laporan karena notifikasi gagal
    }

    if (existingReport.type === 'temuan') {
      const itemStatus = parsed.status === 'selesai' ? 'Selesai' : 'Ditemukan';
      const { error: itemError } = await supabase
        .from('items')
        .update({
          status: itemStatus,
          diterima_di_pos: true,
        })
        .eq('source_report_id', parsed.reportId);

      if (itemError) {
        console.error('Update item error:', itemError);
        return { success: false, error: 'Gagal memperbarui status barang di katalog', code: 'ITEM_UPDATE_FAILED' };
      }
    }

    let eventTitle = `Status diubah ke ${parsed.status}`;
    let eventDescription = parsed.note || `Status laporan diperbarui oleh petugas.`;

    if (parsed.status === 'ditemukan') {
      if (existingReport.type === 'temuan') {
        eventTitle = 'Barang diterima di pos/penyimpanan';
        const details = [
          parsed.finderName ? `Diserahkan oleh: ${parsed.finderName}` : null,
          parsed.foundLocation ? `Lokasi ditemukan: ${parsed.foundLocation}` : null,
          parsed.storageLocation ? `Disimpan di: ${parsed.storageLocation}` : null,
          parsed.note ? `Catatan: ${parsed.note}` : null,
        ].filter(Boolean).join(' · ');
        eventDescription = details || 'Barang telah diterima petugas dan siap tampil di katalog untuk diklaim.';
      } else {
        eventTitle = 'Barang ditemukan';
        eventDescription = parsed.note || 'Barang yang sesuai dengan laporan kehilangan telah ditemukan. Petugas akan menghubungi pelapor untuk verifikasi kepemilikan.';
      }
    } else if (parsed.status === 'selesai') {
      eventTitle = 'Barang berhasil diverifikasi dan diserahkan';
      eventDescription = parsed.note || 'Ciri kepemilikan telah diverifikasi oleh petugas dan barang telah diserahkan kembali kepada pemilik.';
    } else if (parsed.status === 'aktif') {
      eventTitle = 'Laporan diaktifkan kembali dalam pencarian';
      eventDescription = parsed.note || 'Laporan aktif dalam proses pemantauan dan pencarian oleh petugas.';
    }

    await supabase.from('report_events').insert({
      report_id: parsed.reportId,
      title: eventTitle,
      description: eventDescription,
      created_by: user.id,
    });

    revalidatePath('/admin');
    revalidatePath('/lacak');
    revalidatePath('/laporan-saya');
    revalidatePath('/cari');

    return { success: true, data: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Format data laporan tidak valid', code: 'VALIDATION_ERROR' };
    }
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') return { success: false, error: 'Silakan login ulang', code: 'UNAUTHENTICATED' };
      if (error.message === 'FORBIDDEN') return { success: false, error: 'Akses ditolak: hanya untuk petugas', code: 'FORBIDDEN' };
    }
    return { success: false, error: 'Terjadi kesalahan server', code: 'SERVER_ERROR' };
  }
}
