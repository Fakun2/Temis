import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { getBooleanEnv, getPositiveNumberEnv, loadEnv } from "./config";
import { DocumentCleanupWorker } from "./documents/document-cleanup-worker";
import { createLogger } from "./logger";
import { NotificationsWorker } from "./notifications/notifications-worker";
import { NotificationEmailWorker } from "./notifications/notification-email-worker";
import {
  documentCleanupQueueName,
  documentCleanupRoutingKey,
  googleCalendarDisconnectRoutingKey,
  googleCalendarInitialSyncRoutingKey,
  googleCalendarProvisionRoutingKey,
  googleCalendarRoutingKey,
  notificationQueueName,
  notificationEmailQueueName,
  notificationEmailRoutingKey,
  notificationReminderRoutingKey,
  platformSecurityAlertQueueName,
  platformSecurityAlertRoutingKey
} from "./queue/constants";
import { AsyncOutbox } from "./queue/outbox";
import { AsyncOutboxPublisher } from "./queue/publisher";
import { RabbitMq } from "./queue/rabbitmq";
import { sleep } from "./queue/retry";
import type {
  DocumentCleanupRunMessage,
  GoogleCalendarSyncMessage,
  NotificationEmailDeliveryMessage,
  NotificationReminderDueMessage,
  PlatformSecurityAlertMessage
} from "./queue/types";
import { ObjectStorage } from "./storage/object-storage";
import { GoogleCalendarWorker } from "./google-calendar-worker";
import { PlatformSecurityAlertWorker } from "./platform-security-alert-worker";

loadEnv();

const logger = createLogger("Worker");
const prisma = new PrismaClient();
const rabbitMq = new RabbitMq();
const outbox = new AsyncOutbox(prisma);
const notificationEmail = new NotificationEmailWorker(prisma, outbox);
const documentCleanup = new DocumentCleanupWorker(prisma, outbox, new ObjectStorage());
const publisher = new AsyncOutboxPublisher(outbox, rabbitMq);
const googleCalendar = new GoogleCalendarWorker(prisma);
const platformSecurityAlerts = new PlatformSecurityAlertWorker();
let isShuttingDown = false;
const workerRole = process.env.WORKER_ROLE ?? "all";
const isEmailWorker = workerRole === "email";
const notificationEvents = isEmailWorker
  ? null
  : new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const platformHeartbeat = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const notifications = notificationEvents
  ? new NotificationsWorker(prisma, outbox, notificationEvents)
  : null;
const platformWorkerHeartbeatKey = "temis:platform:worker:heartbeat";
const platformWorkerHeartbeatTtlSeconds = 45;
const platformWorkerHeartbeatIntervalMs = 15_000;

async function bootstrap() {
  await prisma.$connect();
  startPlatformHeartbeat();
  startConsumersSupervisor();

  if (getBooleanEnv("ASYNC_OUTBOX_PUBLISHER_ENABLED", true)) {
    publisher.start();
  }

  if (isEmailWorker) {
    logger.info("Temis notification email worker started.");
    return;
  }

  documentCleanup.startRecoveryLoop();
  await googleCalendar.recoverStaleSynchronizations();
  const googleCalendarRecoveryIntervalMs = getPositiveNumberEnv(
    "GOOGLE_CALENDAR_STALE_SYNC_RECOVERY_INTERVAL_MS",
    60_000
  );
  const googleCalendarRecoveryTimer = setInterval(() => {
    void googleCalendar
      .recoverStaleSynchronizations()
      .catch((error) =>
        logger.error("Google Calendar stale synchronization recovery failed.", error)
      );
  }, googleCalendarRecoveryIntervalMs);
  googleCalendarRecoveryTimer.unref?.();
  logger.info("Temis integration worker started.");
}

function startPlatformHeartbeat() {
  const heartbeat = async () => {
    try {
      await platformHeartbeat.set(
        platformWorkerHeartbeatKey,
        new Date().toISOString(),
        "EX",
        platformWorkerHeartbeatTtlSeconds
      );
    } catch (error) {
      logger.warn("Platform worker heartbeat failed.", error);
    }
  };

  void heartbeat();
  const timer = setInterval(() => void heartbeat(), platformWorkerHeartbeatIntervalMs);
  timer.unref?.();
}

function startConsumersSupervisor() {
  void superviseConsumers();
}

async function superviseConsumers() {
  const retryIntervalMs = getPositiveNumberEnv("RABBITMQ_CONSUMER_RETRY_INTERVAL_MS", 5_000);

  while (!isShuttingDown) {
    const disconnectWaiter = rabbitMq.waitForDisconnect();

    try {
      await registerConsumers();
      logger.info("RabbitMQ consumers are active.");
      await disconnectWaiter.promise;

      if (!isShuttingDown) {
        logger.warn("RabbitMQ consumers disconnected. Reconnecting soon.");
      }
    } catch (error) {
      if (!isShuttingDown) {
        logger.error("RabbitMQ consumers failed. Retrying soon.", error);
      }
    } finally {
      disconnectWaiter.dispose();
    }

    if (!isShuttingDown) {
      await sleep(retryIntervalMs);
    }
  }
}

async function registerConsumers() {
  await rabbitMq.bindDefaultQueues();
  if (isEmailWorker) {
    await rabbitMq.consume<NotificationEmailDeliveryMessage>(
      notificationEmailQueueName,
      notificationEmailRoutingKey,
      async (payload) => {
        await notificationEmail.processMessage(payload);
      }
    );
    return;
  }
  await rabbitMq.consume<NotificationReminderDueMessage>(
    notificationQueueName,
    notificationReminderRoutingKey,
    async (payload) => {
      await notifications?.processReminderMessage(payload);
    }
  );
  if (workerRole === "all") {
    await rabbitMq.consume<NotificationEmailDeliveryMessage>(
      notificationEmailQueueName,
      notificationEmailRoutingKey,
      async (payload) => {
        await notificationEmail.processMessage(payload);
      }
    );
  }
  await rabbitMq.consume<DocumentCleanupRunMessage>(
    documentCleanupQueueName,
    documentCleanupRoutingKey,
    async (payload) => {
      await documentCleanup.processCleanupJobMessage(payload);
    }
  );
  await rabbitMq.consume<GoogleCalendarSyncMessage>(
    "bogaap.google-calendar",
    googleCalendarRoutingKey,
    async (payload) => googleCalendar.process(payload)
  );
  await rabbitMq.consume<GoogleCalendarSyncMessage>(
    "bogaap.google-calendar-initial-sync",
    googleCalendarInitialSyncRoutingKey,
    async (payload) => googleCalendar.process(payload)
  );
  await rabbitMq.consume<GoogleCalendarSyncMessage>(
    "bogaap.google-calendar-provision",
    googleCalendarProvisionRoutingKey,
    async (payload) => googleCalendar.process(payload)
  );
  await rabbitMq.consume<GoogleCalendarSyncMessage>(
    "bogaap.google-calendar-disconnect",
    googleCalendarDisconnectRoutingKey,
    async (payload) => googleCalendar.process(payload)
  );
  await rabbitMq.consume<PlatformSecurityAlertMessage>(
    platformSecurityAlertQueueName,
    platformSecurityAlertRoutingKey,
    async (payload) => platformSecurityAlerts.process(payload)
  );
}

async function shutdown() {
  isShuttingDown = true;
  logger.info("Stopping Temis integration worker.");
  publisher.stop();
  await rabbitMq.close();
  await notificationEvents?.quit();
  await platformHeartbeat.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

void bootstrap().catch(async (error) => {
  logger.error("Worker bootstrap failed.", error);
  await rabbitMq.close();
  await notificationEvents?.quit();
  await platformHeartbeat.quit();
  await prisma.$disconnect();
  process.exit(1);
});
