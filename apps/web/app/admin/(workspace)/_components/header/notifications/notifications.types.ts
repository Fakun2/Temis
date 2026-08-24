import type { NotificationDto } from "../../../_api/notifications.api";

export type VisibleNotificationToast = NotificationDto & {
  exiting?: boolean;
};
