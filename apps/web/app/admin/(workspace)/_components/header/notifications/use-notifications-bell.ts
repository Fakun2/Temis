"use client";

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  listNotifications,
  markNotificationRead as markNotificationReadRequest,
  notificationKeys,
  type NotificationsListResponse
} from "../../../_api/notifications.api";
import type { NotificationStreamEvent } from "./notification-stream";
import { useNotificationStream } from "./use-notification-stream";
import { useNotificationToasts } from "./use-notification-toasts";

/** Orchestrates notification server state; presentation and transport live in dedicated hooks. */
export function useNotificationsBell() {
  const queryClient = useQueryClient();
  const query = useDashboardQuery({
    queryKey: notificationKeys.list(),
    queryFn: listNotifications
  });
  const { dismissToast, removeToastImmediately, showToast, syncNotifications, toastNotifications } =
    useNotificationToasts();
  const queryKey = query.tenantId ? [query.tenantId, ...notificationKeys.list()] : null;

  const updateFromStream = useCallback(
    (event: NotificationStreamEvent) => {
      if (!queryKey) return;
      queryClient.setQueryData<NotificationsListResponse>(queryKey, (current) => ({
        items: [
          event.notification,
          ...(current?.items ?? []).filter((item) => item.id !== event.notification.id)
        ].slice(0, 20),
        unreadCount: event.unreadCount
      }));
      showToast(event.notification);
    },
    [queryClient, queryKey, showToast]
  );

  useNotificationStream({
    enabled: Boolean(query.hasSession && query.tenantId),
    onEvent: updateFromStream
  });

  useEffect(() => {
    if (query.data) syncNotifications(query.data.items);
  }, [query.data, syncNotifications]);

  const mutation = useDashboardMutation({
    mutationFn: markNotificationReadRequest,
    onSuccess: () => void query.refetch()
  });
  const markToastAsRead = useCallback(
    (notificationId: string) => {
      dismissToast(notificationId);
      mutation.mutate(notificationId);
    },
    [dismissToast, mutation]
  );

  return {
    dismissToast,
    isLoading: query.isLoading,
    markNotificationRead: mutation.mutate,
    markToastAsRead,
    notifications: query.data?.items ?? [],
    removeToastImmediately,
    toastNotifications,
    unreadCount: query.data?.unreadCount ?? 0
  };
}
