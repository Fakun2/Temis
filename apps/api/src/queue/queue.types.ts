import type { Prisma } from "@prisma/client";

export type QueuePayload = Prisma.JsonObject & {
  deliverAt?: string;
};

export type NotificationReminderDueMessage = QueuePayload & {
  reminderId: string;
  scheduledAt: string;
  tenantId: string;
};

export type DocumentCleanupRunMessage = QueuePayload & {
  jobId: string;
  nextRunAt: string;
  tenantId: string;
};

export type EnqueueOutboxEventInput = {
  payload: QueuePayload;
  routingKey: string;
  tenantId?: string | null;
  topic: string;
  availableAt?: Date;
};
