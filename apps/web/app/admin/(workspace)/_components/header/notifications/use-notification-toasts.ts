"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationDto } from "../../../_api/notifications.api";
import {
  NOTIFICATION_TOAST_EXIT_MS,
  NOTIFICATION_TOAST_MAX_VISIBLE,
  NOTIFICATION_TOAST_VISIBLE_MS
} from "./notifications.constants";
import type { VisibleNotificationToast } from "./notifications.types";

export function useNotificationToasts() {
  const [toastNotifications, setToastNotifications] = useState<VisibleNotificationToast[]>([]);
  const hasEstablishedBaselineRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const visibleIdsRef = useRef(new Set<string>());
  const toastTimeoutsRef = useRef(new Map<string, number>());
  const exitTimeoutsRef = useRef(new Map<string, number>());

  const clearToastTimeouts = useCallback((notificationId: string) => {
    const visibleTimeout = toastTimeoutsRef.current.get(notificationId);
    if (visibleTimeout) window.clearTimeout(visibleTimeout);
    toastTimeoutsRef.current.delete(notificationId);

    const exitTimeout = exitTimeoutsRef.current.get(notificationId);
    if (exitTimeout) window.clearTimeout(exitTimeout);
    exitTimeoutsRef.current.delete(notificationId);
  }, []);

  const removeToastImmediately = useCallback((notificationId: string) => {
    clearToastTimeouts(notificationId);
    visibleIdsRef.current.delete(notificationId);
    setToastNotifications((current) => current.filter((item) => item.id !== notificationId));
  }, [clearToastTimeouts]);

  const dismissToast = useCallback(
    (notificationId: string) => {
      const visibleTimeout = toastTimeoutsRef.current.get(notificationId);
      if (visibleTimeout) window.clearTimeout(visibleTimeout);
      toastTimeoutsRef.current.delete(notificationId);
      const exitTimeout = exitTimeoutsRef.current.get(notificationId);
      if (exitTimeout) return;
      setToastNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, exiting: true } : item))
      );
      exitTimeoutsRef.current.set(
        notificationId,
        window.setTimeout(() => removeToastImmediately(notificationId), NOTIFICATION_TOAST_EXIT_MS)
      );
    },
    [removeToastImmediately]
  );
  const showToast = useCallback(
    (notification: NotificationDto) => {
      if (visibleIdsRef.current.has(notification.id)) return;
      visibleIdsRef.current.add(notification.id);
      setToastNotifications((current) => {
        const next = [{ ...notification, exiting: false }, ...current];
        const evicted = next.slice(NOTIFICATION_TOAST_MAX_VISIBLE);
        evicted.forEach((item) => {
          clearToastTimeouts(item.id);
          visibleIdsRef.current.delete(item.id);
        });
        return next.slice(0, NOTIFICATION_TOAST_MAX_VISIBLE);
      });
      toastTimeoutsRef.current.set(
        notification.id,
        window.setTimeout(() => dismissToast(notification.id), NOTIFICATION_TOAST_VISIBLE_MS)
      );
    },
    [clearToastTimeouts, dismissToast]
  );
  const syncNotifications = useCallback(
    (notifications: NotificationDto[]) => {
      const newNotifications = notifications.filter((notification) => {
        if (seenIdsRef.current.has(notification.id)) return false;
        seenIdsRef.current.add(notification.id);
        return true;
      });

      // The first list request establishes the baseline. Toasts represent arrivals, not history.
      if (!hasEstablishedBaselineRef.current) {
        hasEstablishedBaselineRef.current = true;
        return;
      }
      newNotifications.forEach(showToast);
    },
    [showToast]
  );
  useEffect(
    () => () => {
      for (const notificationId of visibleIdsRef.current) clearToastTimeouts(notificationId);
    },
    []
  );
  return { dismissToast, removeToastImmediately, showToast, syncNotifications, toastNotifications };
}
