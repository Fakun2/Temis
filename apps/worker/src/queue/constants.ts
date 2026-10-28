import { getPositiveNumberEnv } from "../config";

export const rabbitExchangeName = process.env.RABBITMQ_EXCHANGE ?? "bogaap.jobs";
export const notificationReminderRoutingKey = "notification.reminder.due";
export const notificationEmailRoutingKey = "notification.email.send";
export const documentCleanupRoutingKey = "document.cleanup.run";
export const googleCalendarRoutingKey = "google-calendar.event";
export const googleCalendarInitialSyncRoutingKey = "google-calendar.initial-sync";
export const googleCalendarProvisionRoutingKey = "google-calendar.connection-provision";
export const googleCalendarDisconnectRoutingKey = "google-calendar.connection-disconnect";
export const platformSecurityAlertRoutingKey = "platform.security.alert";

export const notificationQueueName =
  process.env.RABBITMQ_NOTIFICATIONS_QUEUE ?? "bogaap.notifications";
export const notificationEmailQueueName =
  process.env.RABBITMQ_NOTIFICATION_EMAIL_QUEUE ?? "bogaap.notification-emails";
export const documentCleanupQueueName =
  process.env.RABBITMQ_DOCUMENT_CLEANUP_QUEUE ?? "bogaap.document-cleanup";
export const platformSecurityAlertQueueName =
  process.env.RABBITMQ_PLATFORM_SECURITY_ALERT_QUEUE ?? "bogaap.platform-security-alerts";

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
