import { dashboardHttpClient } from "@/lib/http";

export type NotificationDto = {
  body: string | null;
  caseId: string;
  deliveredAt: string | null;
  id: string;
  readAt: string | null;
  reminderId: string;
  resourceId: string;
  resourceType: "case_task" | "case_expense" | "case_hearing" | "meeting";
  scheduledAt: string;
  title: string;
};

export type NotificationsListResponse = {
  items: NotificationDto[];
  unreadCount: number;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  list: () => [...notificationKeys.all, "list"] as const
};

export function listNotifications(): Promise<NotificationsListResponse> {
  return dashboardHttpClient.request<NotificationsListResponse>({
    params: { limit: 20, unreadOnly: true },
    path: "/notifications"
  });
}

export function markNotificationRead(notificationId: string): Promise<{ status: "ok" }> {
  return dashboardHttpClient.request<{ status: "ok" }>({
    method: "PATCH",
    path: `/notifications/${notificationId}/read`
  });
}
