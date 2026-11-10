'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, type NotificationRow } from '@/lib/supabase/notifications';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

// Fetch notifications
export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const { notifications } = await fetchNotifications();
      return notifications;
    },
    placeholderData: (previousData) => previousData,
  });
}

// Mark single notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await markNotificationRead(id);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      const previousNotifications = queryClient.getQueryData<NotificationRow[]>(notificationKeys.list());

      queryClient.setQueryData<NotificationRow[]>(notificationKeys.list(), (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === id ? { ...n, read: true } : n));
      });

      return { previousNotifications };
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.list(), context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await markAllNotificationsRead();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.list() });
      const previousNotifications = queryClient.getQueryData<NotificationRow[]>(notificationKeys.list());

      queryClient.setQueryData<NotificationRow[]>(notificationKeys.list(), (old) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, read: true }));
      });

      return { previousNotifications };
    },
    onError: (err, _, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.list(), context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
