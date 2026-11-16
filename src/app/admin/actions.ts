'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createNotification } from '@/lib/supabase/server-notifications';
import { claimStatusNotification, reportStatusNotification } from '@/lib/notification-copy';
import { CLAIM_CLOSED_NOTE } from '@/lib/claim-reasons';
import { DEFAULT_PICKUP_LOCATION } from '@/lib/locations';
import type { FilterStatus, UpdateClaimInput, BulkUpdateInput, Claim, LostReport, ReportStatus, FilterReportStatus } from '@/types/claims';

const updateClaimSchema = z.object({
  claimId: z.string().uuid(),
  status: z.enum(['ditinjau', 'disetujui', 'ditolak']),
  pickupLocation: z.string().trim().min(1).max(200).optional(),
  rejectReason: z.string().trim().max(300).optional(),
});

const bulkUpdateSchema = z.object({
  claimIds: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(['ditinjau', 'disetujui', 'ditolak']),
  pickupLocation: z.string().trim().min(1).max(200).optional(),
  rejectReason: z.string().trim().max(300).optional(),
});

const handoverClaimSchema = z.object({
  claimId: z.string().uuid(),
});

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(['draf', 'aktif', 'ditemukan', 'klaim', 'selesai']),
  storageLocation: z.string().trim().max(200).optional(),
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

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

type CompetingClaim = {
  id: string;
  user_id: string;
  ticket_code: string;
  report_id: string | null;
};

// A winning claim makes every other open claim on the same item impossible to
// fulfil. Close them with their own status so staff do not reject them one by
// one and claimants do not stay stuck on "menunggu verifikasi".
async function closeCompetingClaims(
  supabase: ServerSupabase,
  input: { itemId: string; excludeClaimId?: string; actorId: string }
): Promise<number> {
  let query = supabase
    .from('claims')
    .select('id, user_id, ticket_code, report_id')
    .eq('item_id', input.itemId)
    .in('status', ['diajukan', 'ditinjau']);

  if (input.excludeClaimId) {
    query = query.neq('id', input.excludeClaimId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch competing claims error:', error);
    return 0;
  }

  const competing = (data ?? []) as CompetingClaim[];
  if (competing.length === 0) return 0;

  const closedAt = new Date().toISOString();
  const { error: closeError } = await supabase
    .from('claims')
    .update({
      status: 'ditutup',
      decision_note: CLAIM_CLOSED_NOTE,
      updated_at: closedAt,
    })
    .in('id', competing.map((claim) => claim.id));

  if (closeError) {
    console.error('Close competing claims error:', closeError);
    return 0;
  }

  for (const claim of competing) {
    try {
      await createNotification({
        userId: claim.user_id,
        ...claimStatusNotification({
          status: 'ditutup',
          audience: 'claimant',
          ticketCode: claim.ticket_code,
        }),
        type: 'claim',
        link: `/lacak?ticket=${claim.ticket_code}`,
      });
    } catch (notifyError) {
      console.error('Send closed claim notification error:', notifyError);
    }

    if (claim.report_id) {
      const { error: eventError } = await supabase.from('report_events').insert({
        report_id: claim.report_id,
        title: 'Klaim ditutup',
        description: CLAIM_CLOSED_NOTE,
        created_by: input.actorId,
      });
      if (eventError) console.error('Insert closed claim event error:', eventError);
    }
  }

  return competing.length;
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

    if (claim.status === 'ditutup') {
      return { success: false, error: 'Klaim sudah ditutup karena barang diklaim pemohon lain', code: 'INVALID_TRANSITION' };
    }

    if (claim.status === 'ditolak' && parsed.status !== 'ditinjau') {
      return { success: false, error: 'Klaim yang ditolak hanya dapat dipulihkan ke status "Ditinjau"', code: 'INVALID_TRANSITION' };
    }

    // Reopening a rejected claim must not reopen an item that already belongs
    // to a winning claim; the status trigger would otherwise overwrite it.
    if (claim.status === 'ditolak') {
      const { data: approvedElsewhere } = await supabase
        .from('claims')
        .select('ticket_code')
        .eq('item_id', claim.item_id)
        .eq('status', 'disetujui')
        .limit(1)
        .maybeSingle();

      if (approvedElsewhere) {
        return {
          success: false,
          error: `Klaim tidak dapat dibuka kembali karena barang sudah disetujui untuk tiket ${approvedElsewhere.ticket_code}`,
          code: 'ITEM_ALREADY_CLAIMED',
        };
      }
    }

    if (parsed.status === 'disetujui' && !parsed.pickupLocation) {
      return { success: false, error: 'Lokasi pengambilan wajib diisi untuk persetujuan', code: 'MISSING_PICKUP' };
    }

    if (parsed.status === 'ditolak' && !parsed.rejectReason) {
      return { success: false, error: 'Pilih alasan penolakan agar tercatat untuk pemohon', code: 'MISSING_REASON' };
    }

    if (parsed.status === 'disetujui') {
      const { data: approvedElsewhere } = await supabase
        .from('claims')
        .select('ticket_code')
        .eq('item_id', claim.item_id)
        .eq('status', 'disetujui')
        .neq('id', claim.id)
        .limit(1)
        .maybeSingle();

      if (approvedElsewhere) {
        return {
          success: false,
          error: `Barang ini sudah disetujui untuk tiket ${approvedElsewhere.ticket_code}`,
          code: 'ITEM_ALREADY_CLAIMED',
        };
      }
    }

    const updateData: Record<string, unknown> = {
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };

    if (parsed.pickupLocation) {
      updateData.pickup_location = parsed.pickupLocation;
    }

    if (parsed.status === 'ditolak') {
      updateData.decision_note = parsed.rejectReason;
    } else if (parsed.status === 'ditinjau' || parsed.status === 'disetujui') {
      // Reopening or approving clears the previous rejection reason so the
      // claimant never sees a stale note on the new state.
      updateData.decision_note = null;
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

      await closeCompetingClaims(supabase, {
        itemId: claim.item_id,
        excludeClaimId: claim.id,
        actorId: user.id,
      });
    }

    try {
      const { data: claimItem } = claim.item_id
        ? await supabase
            .from('items')
            .select('user_id, source_report_id, title')
            .eq('id', claim.item_id)
            .maybeSingle()
        : { data: null };

      const claimOwnerId = (claim as { user_id?: string }).user_id;
      const claimTicketLink = `/lacak?ticket=${claim.ticket_code}`;

      if (claimOwnerId) {
        await createNotification({
          userId: claimOwnerId,
          ...claimStatusNotification({
            status: parsed.status,
            audience: 'claimant',
            ticketCode: claim.ticket_code,
            pickupLocation: parsed.pickupLocation ?? claim.pickup_location,
            rejectReason: parsed.rejectReason ?? null,
          }),
          type: 'claim',
          link: claimTicketLink,
        });
      }

      if (claimItem?.user_id && claimItem.user_id !== claimOwnerId) {
        await createNotification({
          userId: claimItem.user_id,
          ...claimStatusNotification({
            status: parsed.status,
            audience: 'finder',
            ticketCode: claim.ticket_code,
            itemTitle: claimItem.title,
          }),
          type: 'claim',
          link: claimItem.source_report_id
            ? `/lacak?report=${claimItem.source_report_id}`
            : '/laporan-saya',
        });
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
        desc = `Alasan penolakan: ${parsed.rejectReason}`;
      } else if (claim.status === 'ditolak' && parsed.status === 'ditinjau') {
        title = 'Klaim dibuka kembali untuk peninjauan ulang';
        desc = 'Petugas membuka kembali tiket klaim ini untuk verifikasi ulang.';
      }

      const { error: eventError } = await supabase.from('report_events').insert({
        report_id: claim.report_id,
        title,
        description: desc,
        created_by: user.id,
      });
      if (eventError) console.error('Insert report event error:', eventError);
    }

    revalidatePath('/admin');
    revalidatePath('/lacak');
    revalidatePath('/laporan-saya');
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

    if (parsed.status === 'ditolak' && !parsed.rejectReason) {
      return { success: false, error: 'Pilih alasan penolakan agar tercatat untuk pemohon', code: 'MISSING_REASON' };
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

    if (parsed.status === 'disetujui') {
      const approvalItemIds = processableClaims.map((claim) => claim.item_id);
      if (new Set(approvalItemIds).size !== approvalItemIds.length) {
        return {
          success: false,
          error: 'Pilih hanya satu klaim untuk setiap barang agar tidak ada dua pemenang',
          code: 'MULTIPLE_CLAIMS_PER_ITEM',
        };
      }

      const { data: alreadyApproved, error: approvedLookupError } = await supabase
        .from('claims')
        .select('ticket_code')
        .in('item_id', approvalItemIds)
        .eq('status', 'disetujui')
        .limit(1);

      if (approvedLookupError) {
        return { success: false, error: 'Gagal memeriksa klaim yang sudah disetujui', code: 'FETCH_FAILED' };
      }

      if (alreadyApproved && alreadyApproved.length > 0) {
        return {
          success: false,
          error: `Salah satu barang sudah disetujui untuk tiket ${alreadyApproved[0].ticket_code}`,
          code: 'ITEM_ALREADY_CLAIMED',
        };
      }
    }

    const updateData: Record<string, unknown> = {
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };

    if (parsed.pickupLocation) {
      updateData.pickup_location = parsed.pickupLocation;
    }

    if (parsed.status === 'ditolak') {
      updateData.decision_note = parsed.rejectReason;
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

        for (const itemId of approvedItemIds) {
          await closeCompetingClaims(supabase, {
            itemId,
            actorId: user.id,
          });
        }
      }
    }

    const events = processableClaims
      .filter(claim => Boolean(claim.report_id))
      .map(claim => ({
        report_id: claim.report_id as string,
        title: parsed.status === 'ditolak' ? 'Klaim ditolak oleh petugas (massal)' : 'Status klaim diperbarui oleh petugas (massal)',
        description: parsed.status === 'ditolak'
          ? `Alasan penolakan: ${parsed.rejectReason}`
          : `Status berubah dari ${claim.status} menjadi ${parsed.status}${parsed.pickupLocation ? `, lokasi: ${parsed.pickupLocation}` : ''}`,
        created_by: user.id,
      }));

    if (events.length > 0) {
      const { error: eventsError } = await supabase.from('report_events').insert(events);
      if (eventsError) console.error('Insert report events error:', eventsError);
    }

    try {
      const itemIds = [...new Set(processableClaims.map((c) => c.item_id).filter(Boolean))] as string[];
      const itemMap: Record<string, { user_id: string; source_report_id: string | null; title: string }> = {};
      if (itemIds.length > 0) {
        const { data: items } = await supabase
          .from('items')
          .select('id, user_id, source_report_id, title')
          .in('id', itemIds);
        if (items) {
          for (const it of items as Array<{ id: string; user_id: string; source_report_id: string | null; title: string }>) {
            itemMap[it.id] = { user_id: it.user_id, source_report_id: it.source_report_id, title: it.title };
          }
        }
      }

      for (const c of processableClaims) {
        const claimOwnerId = (c as { user_id?: string }).user_id;
        const ticketCode = (c as { ticket_code?: string }).ticket_code;
        if (!ticketCode) continue;

        if (claimOwnerId) {
          await createNotification({
            userId: claimOwnerId,
            ...claimStatusNotification({
              status: parsed.status,
              audience: 'claimant',
              ticketCode,
              pickupLocation: parsed.pickupLocation ?? null,
              rejectReason: parsed.rejectReason ?? null,
            }),
            type: 'claim',
            link: `/lacak?ticket=${ticketCode}`,
          });
        }

        const item = c.item_id ? itemMap[c.item_id] : undefined;
        if (item?.user_id && item.user_id !== claimOwnerId) {
          await createNotification({
            userId: item.user_id,
            ...claimStatusNotification({
              status: parsed.status,
              audience: 'finder',
              ticketCode,
              itemTitle: item.title,
            }),
            type: 'claim',
            link: item.source_report_id
              ? `/lacak?report=${item.source_report_id}`
              : '/laporan-saya',
          });
        }
      }
    } catch (notifyError) {
      console.error('Send bulk notification error:', notifyError);
    }

    revalidatePath('/admin');
    revalidatePath('/lacak');
    revalidatePath('/laporan-saya');
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

    const { error: updateClaimError } = await supabase
      .from('claims')
      .update({ pickup_at: handedOverAt, handed_over_at: handedOverAt, updated_at: handedOverAt })
      .eq('id', claim.id);
    if (updateClaimError) {
      console.error('Mark handover claim error:', updateClaimError);
      return { success: false, error: 'Gagal mencatat serah terima', code: 'UPDATE_FAILED' };
    }

    // Approval already closes competing claims, but a direct SQL insert could
    // leave one open until handover. Close it now so nobody waits forever.
    await closeCompetingClaims(supabase, {
      itemId: claim.item_id,
      excludeClaimId: claim.id,
      actorId: user.id,
    });

    const { data: item } = await supabase
      .from('items')
      .select('id, source_report_id, status')
      .eq('id', claim.item_id)
      .maybeSingle();

    const authoritativeReportId = item?.source_report_id ?? null;

    if (item) {
      await supabase.from('items').update({ status: 'Selesai' }).eq('id', item.id);

      if (authoritativeReportId) {
        await supabase
          .from('reports')
          .update({ status: 'selesai', updated_at: handedOverAt })
          .eq('id', authoritativeReportId);

        const { error: handoverEventError } = await supabase.from('report_events').insert({
          report_id: authoritativeReportId,
          title: 'Barang telah diserahkan kepada pemilik',
          description: `Serah terima tiket ${claim.ticket_code} selesai. Lokasi: ${claim.pickup_location ?? '-'}.`,
          created_by: user.id,
        });
        if (handoverEventError) console.error('Insert handover report event error:', handoverEventError);
      }
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
        decision_note,
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

export async function getClaimStatsAction(): Promise<ActionResult<{ total: number; pending: number; approved: number; rejected: number; underReview: number; closed: number }>> {
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
      closed: claims.filter(c => c.status === 'ditutup').length,
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
      storage_location?: string;
    } = {
      status: parsed.status,
      updated_at: new Date().toISOString(),
    };

    if (existingReport.type === 'temuan' && parsed.status === 'ditemukan') {
      reportUpdatePayload.diterima_di_pos = true;
    }

    const resolvedStorage = parsed.storageLocation?.trim() || DEFAULT_PICKUP_LOCATION;

    if (parsed.status === 'ditemukan') {
      reportUpdatePayload.storage_location = resolvedStorage;
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update(reportUpdatePayload)
      .eq('id', parsed.reportId);

    if (updateError) {
      console.error('Update report error:', updateError);
      return { success: false, error: 'Gagal memperbarui status laporan', code: 'UPDATE_FAILED' };
    }

    try {
      const reportOwnerId = (existingReport as { user_id?: string }).user_id;
      const copy = reportStatusNotification({
        type: existingReport.type,
        status: parsed.status,
        itemTitle: existingReport.item_title,
      });

      if (reportOwnerId && copy && existingReport.status !== parsed.status) {
        await createNotification({
          userId: reportOwnerId,
          ...copy,
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
      eventTitle = existingReport.type === 'temuan' ? 'Barang diterima di pos/penyimpanan' : 'Barang ditemukan';
      eventDescription = `Barang telah disimpan di ${resolvedStorage}, lalu diterima dan diverifikasi oleh petugas.`;
    } else if (parsed.status === 'selesai') {
      eventTitle = 'Barang berhasil diverifikasi dan diserahkan';
      eventDescription = parsed.note || 'Ciri kepemilikan telah diverifikasi oleh petugas dan barang telah diserahkan kembali kepada pemilik.';
    } else if (parsed.status === 'aktif') {
      eventTitle = 'Laporan diaktifkan kembali dalam pencarian';
      eventDescription = parsed.note || 'Laporan aktif dalam proses pemantauan dan pencarian oleh petugas.';
    }

    const { error: reportEventError } = await supabase.from('report_events').insert({
      report_id: parsed.reportId,
      title: eventTitle,
      description: eventDescription,
      created_by: user.id,
    });
    if (reportEventError) console.error('Insert report event error:', reportEventError);

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

const ORIGINAL_BUCKET = 'item-originals';
const ORIGINAL_URL_TTL_SECONDS = 60 * 10;

/**
 * Found-item photos are stored blurred at `{ownerId}/{name}.ext`. The clear
 * copy sits at `{ownerId}/original/{name}.webp` in the private bucket.
 */
function originalPathFromImageUrl(imageUrl: string) {
  const marker = '/item-images/';
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const path = decodeURIComponent(imageUrl.slice(markerIndex + marker.length).split('?')[0]);
  const [ownerId, fileName, ...rest] = path.split('/');
  if (!ownerId || !fileName || rest.length > 0) return null;
  if (ownerId === '.' || ownerId === '..') return null;

  const baseName = fileName.replace(/\.[^.]+$/, '');
  return baseName ? `${ownerId}/original/${baseName}.webp` : null;
}

export async function getOriginalImageUrlAction(imageUrl: string): Promise<{ url: string | null }> {
  try {
    await requireAdmin();

    const path = originalPathFromImageUrl(imageUrl);
    if (!path) return { url: null };

    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) return { url: null };

    const service = createServiceClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await service.storage
      .from(ORIGINAL_BUCKET)
      .createSignedUrl(path, ORIGINAL_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) return { url: null };
    return { url: data.signedUrl };
  } catch {
    return { url: null };
  }
}
