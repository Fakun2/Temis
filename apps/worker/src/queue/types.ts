export type QueuePayload = Record<string, unknown> & {
  deliverAt?: string;
};

export type NotificationReminderDueMessage = QueuePayload & {
  reminderId: string;
  scheduledAt: string;
  tenantId: string;
};

export type NotificationEmailDeliveryMessage = QueuePayload & {
  deliveryId: string;
  tenantId: string;
};

export type DocumentCleanupRunMessage = QueuePayload & {
  jobId: string;
  nextRunAt: string;
  tenantId: string;
};

export type PlatformSecurityAlertMessage = QueuePayload & {
  eventId: string;
  eventType: string;
  occurredAt: string;
  outcome: string;
  reason: string | null;
};

export type { GoogleCalendarSyncMessage } from "@temis/integration-contracts";

export type OutboxEventInput = {
  availableAt?: Date;
  payload: QueuePayload;
  routingKey: string;
  tenantId?: string;
  topic: string;
};
