import { createClient } from '@/lib/supabase/client';

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: 'report' | 'claim' | 'pickup' | 'system';
  link: string | null;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, notifications: [] as NotificationRow[] };

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, type, link, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { user, notifications: (data || []) as NotificationRow[] };
}

export async function getUnreadCount() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;

  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);

  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
}

export async function insertNotification({
  userId,
  title,
  body,
  type,
  link,
}: {
  userId: string;
  title: string;
  body?: string;
  type: 'report' | 'claim' | 'pickup' | 'system';
  link?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body: body || null,
    type,
    link: link || null,
  });

  if (error) throw error;
}

export type NotificationChannelPayload = {
  type: 'INSERT';
  schema: 'public';
  table: 'notifications';
  record: NotificationRow;
};

export function subscribeToNotifications(
  userId: string,
  onNotification: (payload: NotificationChannelPayload) => void,
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload as unknown as NotificationChannelPayload);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
