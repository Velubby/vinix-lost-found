import { createClient } from '@supabase/supabase-js';

export type NotificationType = 'report' | 'claim' | 'pickup' | 'system';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for server notifications.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createNotification({
  userId,
  title,
  body,
  type,
  link,
}: {
  userId: string;
  title: string;
  body?: string;
  type: NotificationType;
  link?: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body: body || null,
    type,
    link: link || null,
  });

  if (error) {
    console.error('Insert notification error:', error);
    throw error;
  }
}
