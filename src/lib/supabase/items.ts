import { createClient } from '@/lib/supabase/client';

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

export async function fetchCatalogItems(options?: { withinHours?: number }) {
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

export async function submitItemClaim(input: {
  itemId: string;
  userId: string;
  privateAnswers: string;
  contactPhone: string;
}) {
  const supabase = createClient();

  const { data: activeClaim } = await supabase
    .from('claims')
    .select('id, ticket_code')
    .eq('item_id', input.itemId)
    .eq('user_id', input.userId)
    .in('status', ['diajukan', 'ditinjau', 'disetujui'])
    .maybeSingle();

  if (activeClaim) {
    throw new Error('DUPLICATE_CLAIM');
  }

  const ticketCode = `TKT-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data, error } = await supabase
    .from('claims')
    .insert({
      item_id: input.itemId,
      user_id: input.userId,
      private_answers: input.privateAnswers,
      contact_phone: input.contactPhone,
      ticket_code: ticketCode,
    })
    .select('id, ticket_code')
    .single();

  if (error) throw error;
  return data;
}

