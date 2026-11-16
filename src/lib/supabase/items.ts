import { createClient } from '@/lib/supabase/client';
import type { ClaimStatus } from '@/types/claims';

export interface CatalogItem {
  id: string;
  title: string;
  category: string;
  categoryTag: string;
  location: string;
  date: string;
  time: string;
  foundAt: string;
  image: string | null;
  description: string;
  status: string;
  diterima_di_pos?: boolean;
}

type ItemRow = {
  id: string;
  title: string;
  category: string;
  location: string;
  found_at: string;
  image_url: string | null;
  description: string;
  status: string;
  diterima_di_pos?: boolean;
};

export function mapItem(row: ItemRow): CatalogItem {
  const foundAt = new Date(row.found_at);

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryTag: row.category.toUpperCase(),
    location: row.location,
    date: foundAt.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric' }),
    time: foundAt.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }),
    foundAt: row.found_at,
    image: row.image_url,
    description: row.description,
    status: row.status,
    diterima_di_pos: row.diterima_di_pos ?? false,
  };
}

export async function fetchCatalogItems(options?: { withinHours?: number; since?: string }) {
  let query = createClient()
    .from('items')
    .select('id, title, category, location, found_at, image_url, description, status, diterima_di_pos')
    .eq('diterima_di_pos', true)
    .neq('status', 'Klaim Disetujui')
    .neq('status', 'Selesai')
    .order('found_at', { ascending: false });

  if (options?.withinHours) {
    query = query.gte('found_at', new Date(Date.now() - options.withinHours * 60 * 60 * 1000).toISOString());
  }

  if (options?.since) {
    query = query.gte('found_at', options.since);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as ItemRow[]).map(mapItem);
}

export async function fetchCatalogItemById(id: string): Promise<CatalogItem | null> {
  const { data, error } = await createClient()
    .from('items')
    .select('id, title, category, location, found_at, image_url, description, status, diterima_di_pos')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapItem(data as ItemRow);
}

export type ActiveItemClaim = {
  id: string;
  ticket_code: string;
  status: string;
};

export type ItemClaimState = {
  activeClaim: ActiveItemClaim | null;
  claimCount: number;
  lastClaim: {
    status: ClaimStatus;
    decision_note: string | null;
    created_at: string;
  } | null;
};

export async function fetchItemClaimState(itemId: string, userId: string): Promise<ItemClaimState> {
  const { data, error } = await createClient()
    .from('claims')
    .select('id, ticket_code, status, decision_note, created_at')
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    ticket_code: string;
    status: ClaimStatus;
    decision_note: string | null;
    created_at: string;
  }>;
  const active = rows.find(
    (row) => row.status === 'diajukan' || row.status === 'ditinjau' || row.status === 'disetujui'
  );

  return {
    activeClaim: active ? { id: active.id, ticket_code: active.ticket_code, status: active.status } : null,
    claimCount: rows.length,
    lastClaim: rows[0]
      ? { status: rows[0].status, decision_note: rows[0].decision_note, created_at: rows[0].created_at }
      : null,
  };
}

export async function submitItemClaim(input: {
  itemId: string;
  userId: string;
  privateAnswers: string;
  contactPhone: string;
}) {
  const supabase = createClient();

  const { data: priorClaims, error: priorError } = await supabase
    .from('claims')
    .select('id, status')
    .eq('item_id', input.itemId)
    .eq('user_id', input.userId);

  if (priorError) throw priorError;

  const hasActiveClaim = (priorClaims ?? []).some(
    (claim) => claim.status === 'diajukan' || claim.status === 'ditinjau' || claim.status === 'disetujui'
  );
  if (hasActiveClaim) {
    throw new Error('DUPLICATE_CLAIM');
  }

  // One rejected claim may be retried once; further attempts need staff help.
  if ((priorClaims?.length ?? 0) >= 2) {
    throw new Error('RECLAIM_LIMIT');
  }

  const { data, error } = await supabase
    .from('claims')
    .insert({
      item_id: input.itemId,
      user_id: input.userId,
      private_answers: input.privateAnswers,
      contact_phone: input.contactPhone,
    })
    .select('id, ticket_code')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('DUPLICATE_CLAIM');
    }
    throw error;
  }
  return data;
}

