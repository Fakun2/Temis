import { getPositiveNumberEnv } from "../config";

export const rabbitExchangeName = process.env.RABBITMQ_EXCHANGE ?? "bogaap.jobs";
export const notificationReminderRoutingKey = "notification.reminder.due";
export const documentCleanupRoutingKey = "document.cleanup.run";

export const notificationQueueName =
  process.env.RABBITMQ_NOTIFICATIONS_QUEUE ?? "bogaap.notifications";
export const documentCleanupQueueName =
  process.env.RABBITMQ_DOCUMENT_CLEANUP_QUEUE ?? "bogaap.document-cleanup";

export const outboxPublisherIntervalMs = getPositiveNumberEnv(
  "ASYNC_OUTBOX_PUBLISHER_INTERVAL_MS",
  5_000
);
export const outboxPublisherBatchSize = getPositiveNumberEnv(
  "ASYNC_OUTBOX_PUBLISHER_BATCH_SIZE",
  25
);
export const outboxDatabaseRetryAttempts = getPositiveNumberEnv(
  "ASYNC_OUTBOX_DATABASE_RETRY_ATTEMPTS",
  5
);
export const outboxDatabaseRetryBaseDelayMs = getPositiveNumberEnv(
  "ASYNC_OUTBOX_DATABASE_RETRY_BASE_DELAY_MS",
  250
);
