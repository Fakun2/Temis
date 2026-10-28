import type { NotificationDto } from "../../../_api/notifications.api";

export type NotificationStreamEvent = {
  notification: NotificationDto;
  unreadCount: number;
};

export function parseNotificationStreamEvent(data: string): NotificationStreamEvent | null {
  try {
    const value = JSON.parse(data) as Partial<NotificationStreamEvent>;
    if (!value.notification?.id || typeof value.unreadCount !== "number") return null;
    return { notification: value.notification, unreadCount: value.unreadCount };
  } catch {
    return null;
  }
}
