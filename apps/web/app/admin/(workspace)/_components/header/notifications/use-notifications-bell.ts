"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";
import {
  listNotifications,
  markNotificationRead as markNotificationReadRequest,
  notificationKeys,
  type NotificationDto,
  type NotificationsListResponse
} from "../../../_api/notifications.api";
import {
  NOTIFICATION_TOAST_EXIT_MS,
  NOTIFICATION_TOAST_MAX_VISIBLE,
  NOTIFICATION_TOAST_VISIBLE_MS
} from "./notifications.constants";
import type { VisibleNotificationToast } from "./notifications.types";

export function useNotificationsBell() {
  const queryClient = useQueryClient();
  const [toastNotifications, setToastNotifications] = useState<VisibleNotificationToast[]>([]);
  const seenIdsRef = useRef(new Set<string>());
  const toastTimeoutsRef = useRef(new Map<string, number>());
  const toastExitTimeoutsRef = useRef(new Map<string, number>());

  const query = useDashboardQuery({
    queryKey: notificationKeys.list(),
    queryFn: listNotifications
  });

  const mutation = useDashboardMutation({
    mutationFn: (notificationId: string) => markNotificationReadRequest(notificationId),
    onSuccess: () => {
      void query.refetch();
    }
  });

  const dismissToast = useCallback((notificationId: string) => {
    const timeout = toastTimeoutsRef.current.get(notificationId);
    if (timeout) {
      window.clearTimeout(timeout);
      toastTimeoutsRef.current.delete(notificationId);
    }

    const exitTimeout = toastExitTimeoutsRef.current.get(notificationId);
    if (exitTimeout) {
      window.clearTimeout(exitTimeout);
    }

    setToastNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, exiting: true } : notification
      )
    );

    const removalTimeout = window.setTimeout(() => {
      setToastNotifications((current) =>
        current.filter((notification) => notification.id !== notificationId)
      );
      toastExitTimeoutsRef.current.delete(notificationId);
    }, NOTIFICATION_TOAST_EXIT_MS);
    toastExitTimeoutsRef.current.set(notificationId, removalTimeout);
  }, []);

  const removeToastImmediately = useCallback((notificationId: string) => {
    setToastNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId)
    );
  }, []);

  const markToastAsRead = useCallback(
    (notificationId: string) => {
      dismissToast(notificationId);
      mutation.mutate(notificationId);
    },
    [dismissToast, mutation]
  );

  useEffect(() => {
    const notifications = query.data?.items ?? [];
    if (!notifications.length) {
      return;
    }

    const newNotifications = notifications.filter((notification) => {
      if (seenIdsRef.current.has(notification.id)) {
        return false;
      }

      seenIdsRef.current.add(notification.id);
      return true;
    });

    if (!newNotifications.length) {
      return;
    }

    setToastNotifications((current) =>
      [
        ...newNotifications.map((notification) => ({ ...notification, exiting: false })),
        ...current
      ].slice(0, NOTIFICATION_TOAST_MAX_VISIBLE)
    );

    for (const notification of newNotifications) {
      const existingTimeout = toastTimeoutsRef.current.get(notification.id);
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      const timeout = window.setTimeout(() => {
        dismissToast(notification.id);
      }, NOTIFICATION_TOAST_VISIBLE_MS);
      toastTimeoutsRef.current.set(notification.id, timeout);
    }
  }, [dismissToast, query.data?.items]);

  useEffect(() => {
    if (!query.hasSession || !query.tenantId) {
      return;
    }

    const eventSource = new EventSource("/api/notifications/stream");
    const queryKey = [query.tenantId, ...notificationKeys.list()];

    function handleNotification(event: Event) {
      const data = parseNotificationStreamEvent((event as MessageEvent<string>).data);
      if (!data) {
        return;
      }

      queryClient.setQueryData<NotificationsListResponse>(queryKey, (current) => {
        const currentItems = current?.items ?? [];
        const nextItems = [
          data.notification,
          ...currentItems.filter((item) => item.id !== data.notification.id)
        ].slice(0, NOTIFICATION_TOAST_MAX_VISIBLE * 5);

        return {
          items: nextItems,
          unreadCount: data.unreadCount
        };
      });
    }

    eventSource.addEventListener("notification", handleNotification);

    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.close();
    };
  }, [query.hasSession, query.tenantId, queryClient]);

  useEffect(() => {
    return () => {
      for (const timeout of toastTimeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }
      for (const timeout of toastExitTimeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }
      toastTimeoutsRef.current.clear();
      toastExitTimeoutsRef.current.clear();
    };
  }, []);

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

type NotificationStreamEvent = {
  notification: NotificationDto;
  unreadCount: number;
};

function parseNotificationStreamEvent(data: string): NotificationStreamEvent | null {
  try {
    const value = JSON.parse(data) as Partial<NotificationStreamEvent>;

    if (!value.notification?.id || typeof value.unreadCount !== "number") {
      return null;
    }

    return {
      notification: value.notification,
      unreadCount: value.unreadCount
    };
  } catch {
    return null;
  }
}
