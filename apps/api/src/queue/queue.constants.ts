export const rabbitExchangeName = process.env.RABBITMQ_EXCHANGE ?? "bogaap.jobs";
export const notificationReminderRoutingKey = "notification.reminder.due";
export const documentCleanupRoutingKey = "document.cleanup.run";

export const notificationQueueName =
  process.env.RABBITMQ_NOTIFICATIONS_QUEUE ?? "bogaap.notifications";
export const documentCleanupQueueName =
  process.env.RABBITMQ_DOCUMENT_CLEANUP_QUEUE ?? "bogaap.document-cleanup";

export const outboxPublisherIntervalMs = getPositiveEnvNumber(
  "ASYNC_OUTBOX_PUBLISHER_INTERVAL_MS",
  5_000
);
export const outboxPublisherBatchSize = getPositiveEnvNumber(
  "ASYNC_OUTBOX_PUBLISHER_BATCH_SIZE",
  50
);
export const outboxDatabaseRetryAttempts = getPositiveEnvNumber(
  "ASYNC_OUTBOX_DATABASE_RETRY_ATTEMPTS",
  5
);
export const outboxDatabaseRetryBaseDelayMs = getPositiveEnvNumber(
  "ASYNC_OUTBOX_DATABASE_RETRY_BASE_DELAY_MS",
  250
);

export function getPositiveEnvNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
