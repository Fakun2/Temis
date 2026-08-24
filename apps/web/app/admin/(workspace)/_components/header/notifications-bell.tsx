"use client";

import { NotificationToastStack } from "./notifications/notification-toast-stack";
import { NotificationsPopover } from "./notifications/notifications-popover";
import { useNotificationsBell } from "./notifications/use-notifications-bell";

export function NotificationsBell() {
  const {
    dismissToast,
    isLoading,
    markNotificationRead,
    markToastAsRead,
    notifications,
    removeToastImmediately,
    toastNotifications,
    unreadCount
  } = useNotificationsBell();

  return (
    <>
      <NotificationsPopover
        isLoading={isLoading}
        notifications={notifications}
        onRead={markNotificationRead}
        unreadCount={unreadCount}
      />
      <NotificationToastStack
        notifications={toastNotifications}
        onDismiss={dismissToast}
        onRead={markToastAsRead}
        onExited={removeToastImmediately}
      />
    </>
  );
}
